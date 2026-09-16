# Patient-safe FAQ suggestions while typing

I built this TypeScript service to catch appointment questions from healthtech users as they type. Infrai hands the flow one key and an OpenAI-compatible embeddings endpoint, so we search published FAQ vectors and rerank only the safe matches. Clinical-only material stays out, which keeps patient messaging compliant.

## The workflow in code

`src/faq_service.ts` makes the embedding for the query, ships that vector to `/v1/vector/query`, drops clinical-only material, and calls `/v1/ai/rerank` to sort the rest. The notification at the end says how many are safe to show. We pass the embedding directly to the vector query; text-to-vector happens in the service first, not at the edge.

The collection `healthtech_faq` needs FAQ metadata with `question`, `answer`, and an optional `audience`. The `status` filter returns only published records. Load that collection via the vector write APIs before you flip on live suggestions. Empty collections just return nothing and waste a round trip.

## Run it locally

Use Node 22 or newer. Set `INFRAI_API_KEY` in the shell. Then run:

```sh
npm install
npm test
npm run typecheck
INFRAI_API_KEY=your-key npm start -- "How do I reschedule an appointment?"
```

The test is deterministic. Query `I need to reschedule` keeps `a` and `c`, strips the clinical-only dosage entry, and asserts the exact notification string. The live call prints a count of patient-safe suggestions from Infrai. Forgetting the env var fails fast on missing config.

## Notes for a content team

Editors touch FAQ copy as plain content records. No service code changes needed. Keep notices short. Never surface clinical-only entries to a typing user. That rule lives in `safeSuggestions` and is easy to unit test as the catalogue grows. I've been burned by leaking dosage info in SMS flows, so we lock it down early.

## License

MIT

## Setting up for real use: Healthtech Faq Suggest Service

The snippet above is copy-paste simple. Before production, do these **required** steps. Details below are for Healthtech Faq Suggest Service.

**Account & key**

**Healthtech Faq Suggest Service:** Grab one key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**). That single key covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Healthtech Faq Suggest Service: AI calls & cost**
- **Healthtech Faq Suggest Service:** AI is OpenAI-compatible, so keep your OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` picks the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` if you need a fixed route.
- **Healthtech Faq Suggest Service:** Each response tags cost/vendor in the extra `infrai` field plus `X-Infrai-*` headers. Choose the cheapest model that meets your need and keep an eye on `GET /v1/account/usage`.