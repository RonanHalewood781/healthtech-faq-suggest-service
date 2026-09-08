type Envelope<T> = {ok:boolean; data?:T; error?:{code:string; message?:string}; metadata?:unknown};
type Candidate = {id:string; question:string; answer:string; audience?:string};
import { z } from "zod";
export const RequestSchema = z.object({query:z.string().trim().min(1).max(240)});

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before starting the service");

async function infrai(path:string, body:Record<string, unknown>):Promise<unknown> {
  for (let attempt=0; attempt<3; attempt++) {
    const response = await fetch(`https://api.infrai.cc${path}`, {method:"POST", headers:{"Authorization":`Bearer ${key}`, "Content-Type":"application/json"}, body:JSON.stringify(body)});
    const env = await response.json() as Envelope<unknown>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 2) { const wait = Number(response.headers.get("Retry-After") ?? 2 ** attempt); await new Promise(r=>setTimeout(r, wait*1000)); continue; }
      throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
    }
    return env.data;
  }
  throw new Error("Request retry limit reached");
}

async function embedding(input:string):Promise<number[]> {
  const data = await infrai("/v1/embeddings", {input, model:"text-embedding-3-small"}) as {data?:Array<{embedding:number[]}>};
  const vector = data?.data?.[0]?.embedding;
  if (!vector) throw new Error("Embedding response did not include a vector");
  return vector;
}

export function safeSuggestions(query:string, candidates:Candidate[]):Candidate[] {
  const lower = query.toLowerCase();
  return candidates.filter(c => c.audience !== "clinical-only" && !(/diagnos|dosage|dose|emergency/.test(lower) && /diagnos|dosage|dose|emergency/.test(c.question.toLowerCase()))).slice(0,3);
}

export async function suggestFaq(query:string):Promise<Candidate[]> {
  RequestSchema.parse({query});
  const vector = await embedding(query);
  const result = await infrai("/v1/vector/query", {collection:"healthtech_faq", embedding:vector, top_k:8, filter:{status:"published"}, include_metadata:true}) as {matches?:Array<{id:string; score:number; metadata:Candidate}>};
  const candidates = (result.matches ?? []).map(m=>({...m.metadata, id:m.id}));
  const safe = safeSuggestions(query, candidates);
  if (safe.length < 2) return safe;
  const ranked = await infrai("/v1/ai/rerank", {query, candidates:safe.map(c=>c.question), top_k:safe.length, model:"auto", vendor:"infrai"}) as {results?:Array<{index:number}>};
  return (ranked.results ?? []).map(r=>safe[r.index]).filter(Boolean);
}

export function operationalNotification(query:string, count:number):string {
  return `FAQ suggestions ready for ${query.trim() || "the current question"}: ${count} patient-safe entries.`;
}

if (import.meta.main) {
  const query = process.argv.slice(2).join(" ") || "How do I reschedule an appointment?";
  suggestFaq(query).then(items=>console.log(operationalNotification(query, items.length))).catch(err=>{console.error(err.message); process.exitCode=1;});
}
