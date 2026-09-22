<div align="center">

# Domain-Specific Harness

**Describe a business. Get a working operations system.**

A domain-agnostic kernel — a state machine, a policy gate and an audit ledger — that runs
any service business from a config file. Eleven lifecycle templates ship with it, and a
builder turns one line of English into a deployed app with its own database, voice agents
and workflows.

</div>

![The builder](docs/screenshots/01-builder.png)

---

## The idea

Most operations software is the same three questions asked in different vocabularies:

1. **What state is this thing in, and what may happen to it next?**
2. **May the system do this alone, or does a human have to approve it?**
3. **What happened, who did it, and can we prove it?**

A shipment, a dental appointment, a court matter and a gym membership differ in their
nouns, their stages and where their brakes sit — not in the shape of those questions. So
the kernel that answers them is fixed code, and everything business-specific is data.

That is the whole design. A vertical is a config file. Adding an industry is writing one,
not forking the system.

```ts
export const dental = defineVertical({
  id: "dental",
  lifecycle: {
    order: ["enquiry", "scheduled", "consultation", "treatment_plan",
            "in_treatment", "billing", "recall", "closed"],
    initial: "enquiry",
    states: { /* what may happen in each, and where it can go next */ },
  },
  policy: {
    alwaysApprove: {
      prescribe: { why: "prescribing is a clinical decision", approver: "compliance" },
    },
    thresholds: [
      { actions: ["raise_invoice"], measure: "amount", limit: 25_000,
        trigger: "atOrAbove", approver: "finance" },
    ],
  },
});
```

The state machine and the policy gate never learn what business they are serving. They are
handed a config and they run it.

---

## What a built business looks like

This was generated from a one-line description. Its own name, its own vocabulary
("leads", "trial bookings", "coaches"), its own lifecycle, its own data.

![A built business](docs/screenshots/02-built-app-overview.png)

Every screen is driven by the build's manifest, so the navigation, the stage counts and
the forms are all derived from the vertical rather than hand-written per industry.

---

## Templates

Eleven ship today. Each is a *lifecycle shape* rather than a single product — the clinical
shape fits dentistry, physiotherapy, dermatology and diagnostics; the custody shape fits
phone repair, appliance service, tailoring and equipment hire. Between them the eleven
shapes cover well over a hundred recognisable business types.

| Template | Stages | Human-only actions | Shape it covers |
| --- | --- | --- | --- |
| **Freight forwarding** | 10 | 5 | Cut-off driven: consolidation, customs brokerage, haulage |
| **Recruitment desk** | 8 | 4 | Two-sided matching: staffing, executive search, contracting |
| **Dental practice** | 8 | 5 | Clinical, multi-visit: dentistry, physio, dermatology |
| **Veterinary practice** | 8 | 5 | Clinical with admission: vets, day clinics, diagnostics |
| **Law firm** | 8 | 6 | Matter-based: litigation, conveyancing, compliance advisory |
| **Real estate brokerage** | 8 | 4 | High-value transaction: sales, leasing, land |
| **Catering & events** | 8 | 4 | Fixed-date delivery: catering, weddings, production |
| **Repair shop** | 8 | 3 | Custody of goods: devices, appliances, instruments |
| **Gym & fitness studio** | 7 | 3 | Subscription and retention: gyms, studios, clubs |
| **Salon & spa** | 7 | 2 | Resource scheduling: salons, spas, grooming |
| **Tutoring centre** | 8 | 4 | Enrolment and term: coaching, music schools, driving schools |

Every one is validated by the same checks — reachable states, no dangling transitions, no
undeclared actions, no dead policy config — so a template nobody is running today is still
held to the standard of the one in production.

Adding a twelfth is a config file and a line in the registry. `ready: false` keeps it out
of routing until it is finished, so a half-written lifecycle can never take a real request.

---

## The builder

Two modes, one model call each.

**Fork** — a new business from a template. The model receives a compact digest of the
template and returns only a *delta*: which states change, which columns are renamed or
dropped, which agents and workflows to keep. Everything after that is deterministic —
the SQL, the cloned workflow JSON, the agent prompts and the vertical config are generated
from the delta, not written by the model. Mechanical slips are repaired in code; anything
else is rejected with one repair attempt.

**Extend** — a change to an existing system, diffed against a live manifest of what is
actually deployed. It stops at an approval diff and never executes on its own.

```bash
npm run fork -- "a dental clinic in Chennai that books by phone"
npm run fork -- --build "a gym that runs trials before membership"
npm run app -- <build-name>          # run it as its own app on its own port
```

Routing is deterministic rather than a model guess: a request is matched against each
template's vocabulary, and when nothing scores above the floor it returns **no template**
rather than a default. A wrong template is worse than none — it hands every downstream
verdict a lifecycle from the wrong industry while looking perfectly confident.

---

## What a build gets

| | |
| --- | --- |
| **Its own app** | Own process, own port, own data. React shell driven entirely by the build manifest. |
| **Its own database** | Generated schema, named for the business rather than the template. |
| **Voice agents** | Draft agents cloned from the template's setup, renamed so no two builds collide. |
| **Workflows** | n8n workflows, imported switched off, with credentials attached. |
| **Memory** | Its own Cognee dataset, seeded and cognified. |
| **An audit trail** | Every write carries a desk user and lands in an append-only ledger. |

Isolation is enforced rather than assumed: everything is namespaced `[<build name>]`, and
an update or delete requires both the id in that build's record *and* the namespaced name
read back live.

---

## Safety properties

These are deliberate and tested, not aspirations:

- **The policy gate and the state machine are separate questions.** `can()` asks whether an
  action is legal in this state; `decide()` asks whether a human must approve it. Both must
  pass. Conflating them is how systems end up with a legal action nobody sanctioned.
- **Nothing happens without a ledger entry.** `record()` takes the action as a callback and
  runs it, so there is no path that performs an action and forgets to log it. Reversal
  appends; it never deletes.
- **Approval is not self-service.** The requester cannot approve their own held action, and
  approval re-checks legality rather than trusting the earlier verdict.
- **Memory degrades, the record does not.** The memory client returns empty and never
  throws — an outage must not block a booking. The CRM adapter does the opposite and throws
  loudly, because silently dropping a commitment is worse than an error.
- **Auth fails closed.** The service refuses to start without its secret. There is no
  `if (secret && ...)` pattern anywhere, because that shape passes when the secret is unset.
- **No CORS.** Nothing in a browser reaches the core API.

---

## Running it

```bash
npm install
cp .env.example .env          # then generate a secret, see below
npm start                     # core service on :8788
npm run builder:web           # builder UI on 127.0.0.1:8790
```

The service refuses to start without `SHIPMATE_API_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The builder UI binds loopback only and rejects non-local Host headers — it holds
privileged keys. `--lan` adds this machine's network with a required access key;
`--public` is the hosted mode described in [docs/HOSTING.md](docs/HOSTING.md).

### Tests

```bash
npm test
```

522 checks across the domain logic, every shipped vertical, the builder, the app runtime,
the deploy isolation rules and the workflow structure. No network, no API keys, no
database — they run anywhere.

---

## Layout

```
src/verticals/     the eleven templates + the config type and its validator
src/domain/        the kernel: state machine, policy gate, commitments — pure, no I/O
src/engines/       audit ledger, store, cut-off sentinel, intake, quoting pipeline
src/builder/       fork, extend, routing, planning, deployment, the web UI server
src/app-runtime/   serves a build as its own standalone application
apps/crm-shell/    the React shell every built app renders through
n8n/               importable workflows
docs/              hosting guide, screenshots, the orchestration plan
```

---

## Status

Built as a working system rather than a demo, and honest about the line between them:

**Proven** — the kernel, all eleven templates, the policy gate, the audit ledger, the
builder's fork path, the app runtime, and the deploy isolation rules. These are covered by
the test suite and exercised by real builds.

**Wired, not proven in production** — the call-extraction path is built and typechecked but
has not run against live transcripts at volume. The payment leg has its shape and its
policy gate, but its callback does not yet verify the provider's checksum, so it must not
release anything until that lands.

**Not built** — outbound calling, and the pricing and compliance sub-agents.

---

<div align="center">
<sub>Built with the Araxys harness.</sub>
</div>
