# Security policy

## Scope

`faithful-echo` is an offline diagnostic tool.  It reads two text files,
runs deterministic regex/dictionary rules against them, and emits a
report.  It does not call the network, does not persist state outside
the report it prints, and does not execute user-provided code.

This means most "security" categories simply do not apply.  We
nevertheless welcome reports in two areas:

- **Path traversal / arbitrary file read.**  The CLI reads the
  `--source` and `--rendered` paths exactly as provided.  If you find
  a way for the tool to read a file *other* than what was specified,
  that is a bug.
- **Regex pathological complexity.**  All rule patterns are intended
  to run in linear or near-linear time.  If you find input that takes
  super-linear time, please report it.

## Reporting a vulnerability

Open a private security advisory via GitHub:

  Security ▸ Advisories ▸ Report a vulnerability

If for any reason that channel is not available, file a regular issue
**without** including any sensitive material.  We will respond and
move the conversation off the public tracker.
