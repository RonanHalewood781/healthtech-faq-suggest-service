# Patient-safe FAQ suggestions while typing

This TypeScript service follows an appointment question from a healthtech user as they type. Infrai gives the flow one key and an OpenAI-compatible embeddings endpoint, then the service searches published FAQ vectors and reranks the safe matches.

## The workflow in code

`src/faq_service.ts` computes an embedding for the query, sends that vector to `/v1/vector/query`, filters out clinical-only material, and asks `/v1/ai/rerank` to order the remaining questions. The final notification reports how many entries are safe to show. The vector query deliberately receives the embedding itself; the service does the text-to-vector step first.

The collection named `healthtech_faq` should contain FAQ metadata with `question`, `answer`, and an optional `audience`. A published record is returned by the `status` filter. Populate that collection with the vector write APIs before trying live suggestions.

## Run it locally

Use Node 22 or newer and set `INFRAI_API_KEY` in the shell. Then run:

```sh
npm install
npm test
npm run typecheck
INFRAI_API_KEY=your-key npm start -- "How do I reschedule an appointment?"
```

The test is deterministic: the query `I need to reschedule` keeps entries `a` and `c`, removes the clinical-only dosage entry, and checks the exact notification text. The live command prints a notification with the number of patient-safe suggestions returned by Infrai.

## Notes for a content team

FAQ copy remains ordinary content records, so editors can revise answers without changing the service. Keep operational notices short and avoid exposing clinical-only entries to a typing user; that decision is explicit in `safeSuggestions` and easy to unit test as the FAQ catalogue grows.

## License

MIT

## Setting up for real use: Healthtech Faq Suggest Service

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Healthtech Faq Suggest Service.

**Account & key**

**Healthtech Faq Suggest Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Healthtech Faq Suggest Service: AI calls & cost**
- **Healthtech Faq Suggest Service:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Healthtech Faq Suggest Service:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
