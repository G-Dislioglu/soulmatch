# Builder Benchmark K2.8b Free Ops Subset Report

## Scope

- corridor: `K2.8b`
- mode: `narrowed free operational class_1 subset`
- live baseline commit: `2dbab36`
- basis: response to the `K2.8a` boundary finding
- runner file: `server/scripts/builder-k28b-free-ops-runner.ts`
- package script: `pnpm --dir server builder:k28b`

## Tasks

### K28B-T01

- type: exact append on a tiny helper file
- target: `docs/archive/k26c-helper-smoke.txt`
- landed commit: `2ee184b3fe8ab3f639fb292c8fbff5d81d43da50`
- result: `pass`

### K28B-T02

- type: exact single-line helper create-target
- target: `docs/archive/k28b-free-class1-ops-smoke.txt`
- landed commit: `10d4e13ef3e328d27eb2fe931686c12cd1665b56`
- result: `pass`

## Why this subset was narrower

`K2.8a` showed that two specific forms were still too brittle for immediate
free operation:

- append on a larger docs file
- multi-line helper create-target

`K2.8b` therefore narrowed the same corridor to two smaller forms:

- tiny helper append
- one-line helper create-target

## Verified landings

Both landings were exact and scope-clean:

- `2ee184b` changed only `docs/archive/k26c-helper-smoke.txt`
- `10d4e13` changed only `docs/archive/k28b-free-class1-ops-smoke.txt`

No extra file landed in either case.

## Live truth

After `K2.8b`, live `/api/health` moved to:

- `commit=10d4e13ef3e328d27eb2fe931686c12cd1665b56`

That means the narrower operational subset is not just repo-visible, but also
running on the live runtime.

## Outcome

- tiny helper append: `green`
- single-line helper create-target: `green`
- pass count: `2/2`
- deviation count: `0`

## Meaning

`K2.8b` is the first clean proof that the free `class_1` corridor is not only
evidenced and repeatable, but **operationally usable in a narrow form**.

That narrow operational form now includes:

- exact docs/helper anchored replacements
- tiny helper append
- single-line helper create-target

Broader helper/docs operations still remain outside the free lane until they
are separately hardened.
