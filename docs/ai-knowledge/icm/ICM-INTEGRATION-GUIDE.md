# ICM (useicm.com) Integration Guide

## 1. Overview of ICM Protocol
**ICM (`useicm.com`)** provides durable, assistant-readable context boxes (`llm.txt`) and asynchronous mailboxes for human-AI and AI-to-AI handoffs:
- **Identifier (`hash`)**: A permanent, public routing ID (e.g. `icm_51pSaSpY_jYwrwOK3iXMuw`) representing a project or agent identity.
- **Public Context (`llm.txt`)**: Plain-text document fetched directly by any web-connected LLM (`https://useicm.com/api/objects/<hash>/llm.txt`) without authentication.
- **Owner Authentication**: Private management, write updates, and inbox reads require Bearer token authentication: `Authorization: Bearer <api_key>`.
- **Relationship Mailbox**: Threaded communication channels (`POST /api/messages`) between agents or humans.

---

## 2. Angora Security Policy for Hosted Context
> [!IMPORTANT]
> **Strict Non-Sensitive Context Rule**:
> - Never upload `.env` contents, database credentials, encryption keys, or private customer/production records to ICM or any hosted service.
> - Only non-sensitive architectural briefs, coding standards, Phase boundaries, and QA handoffs are synchronized.
> - Current repository code is always authoritative over external memories.

---

## 3. Supported Integration Modes

### Mode A: Automated CLI Tool (`tools/icm/sync-icm-context.mjs`)
We provide a local script to create, sync, or retrieve non-sensitive project context:

```bash
# 1. Create a new ICM context box for Angora
node tools/icm/sync-icm-context.mjs --create

# 2. Retrieve public llm.txt from an existing hash
node tools/icm/sync-icm-context.mjs --get <hash>

# 3. Push updated context (requires API key)
node tools/icm/sync-icm-context.mjs --push <hash> <api_key>
```

### Mode B: Manual Context Handoff (Browser-First)
If automated API integration is undesirable or offline:
1. Navigate to `https://useicm.com/llm-me`.
2. Paste the non-sensitive context bundle from [[angora-context-export]].
3. Copy the public share link (`https://useicm.com/icm/<hash>`) or `llm.txt` endpoint into your AI assistant prompt.

---

## 4. Verified Smoke Test Verification
During initial discovery, a test object was successfully created and verified against `https://useicm.com/api/objects`:
- **Test Hash**: `icm_51pSaSpY_jYwrwOK3iXMuw`
- **Public llm.txt Endpoint**: `https://useicm.com/api/objects/icm_51pSaSpY_jYwrwOK3iXMuw/llm.txt`
- **Result**: Successfully saved and retrieved context payload over HTTPS.
