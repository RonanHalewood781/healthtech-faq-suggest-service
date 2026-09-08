import assert from "node:assert/strict";
import {safeSuggestions, operationalNotification} from "../src/faq_service.ts";

const entries = [
  {id:"a", question:"How do I reschedule an appointment?", answer:"Use the appointments screen."},
  {id:"b", question:"What dosage should I take?", answer:"Contact your care team.", audience:"clinical-only"},
  {id:"c", question:"Where can I update my phone number?", answer:"Open profile settings."}
];
const result = safeSuggestions("I need to reschedule", entries);
assert.deepEqual(result.map(x=>x.id), ["a","c"]);
assert.equal(operationalNotification("reschedule", 2), "FAQ suggestions ready for reschedule: 2 patient-safe entries.");
console.log("faq safety decision: ok");
