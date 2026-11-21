# website (openOODA) — public docs & zero-telemetry static-site conformance gate
#
# Usage:
#   make build      - ooda-compiler build cli/main.oo -> bin/website (+ dist/website copy)
#   make test       - build + run functional/refusal .oo suites and the site gate
#   make verify     - line-cap, file-law, academy, density, vocab, shape, link-law,
#                     check, site-gate
#   make tracker    - regenerate the repository completion tracker in docs/index.html
#                     from live GitHub state (needs GH_TOKEN or GITHUB_TOKEN)
#   make site-gate  - static webroot gate over docs/ (refs, CNAME, icons, telemetry)
#   make clean      - remove build artifacts

OODA_COMPILER ?= $(HOME)/.openooda/bin/ooda-compiler
RESOLVED_COMP := $(if $(wildcard $(OODA_COMPILER)),$(OODA_COMPILER),$(HOME)/.openooda/bin/ooda-compiler)
export OODA_COMPILER
OODAC_BIN ?= $(RESOLVED_COMP)
export OODAC_BIN
OODA_READDIR ?= $(HOME)/.openooda:$(CURDIR):/tmp:/usr:/lib:/lib64
OODA_WRITEDIR ?= $(CURDIR):/tmp
OO_LIST_AMBIENT_QUOTA ?= 8589934592
OODA_RUNTIME_ROOT ?= $(HOME)/.openooda/bin
export OODA_RUNTIME_ROOT
OODA_STANDARD_ROOT ?= $(HOME)/.openooda/ooda-standard
export OODA_STANDARD_ROOT
unexport OODA_OODAR_ROOT
unexport OODA_OOSTD_ROOT
BIN := bin/website
WASM := docs/js/site_ui.wasm
TBIN := .ooda-cache/test_functional
TBIN2 := .ooda-cache/test_refusal
SRC := $(shell find . -name '*.oo' -not -path './.git/*' -not -path './bin/*' -not -path './dist/*' -not -path './.ooda-cache/*' | sort)
WASM_SRC := $(sort $(wildcard core/wasm/*.oo))

ENV := OO_LIST_AMBIENT_QUOTA=$(OO_LIST_AMBIENT_QUOTA) OO_LINT_ROOTS=$(CURDIR) OODA_COMPILER=$(RESOLVED_COMP) OODAC_BIN=$(RESOLVED_COMP) OODA_FS_READDIR=$(OODA_READDIR) OODA_FS_WRITEDIR=$(OODA_WRITEDIR) OODA_RUNTIME_ROOT=$(OODA_RUNTIME_ROOT) OODA_STANDARD_ROOT=$(OODA_STANDARD_ROOT) OODA_NO_JAIL=1

.PHONY: all build wasm test verify clean line-cap file-law academy density vocab shape link-law check site-gate tracker tracker-check assets version-check

all: build verify test

build: $(BIN) $(WASM)

wasm: $(WASM)

$(WASM): $(WASM_SRC)
	$(ENV) $(RESOLVED_COMP) build core/wasm/site_ui.oo --target wasm32-unknown-unknown --shared -o $(WASM)

$(BIN): $(SRC)
	@mkdir -p bin dist .ooda-cache
	$(ENV) $(RESOLVED_COMP) build cli/main.oo -o $(BIN)
	@chmod +x $(BIN)
	@strip $(BIN) 2>/dev/null || true
	@cp -f $(BIN) dist/website
	@chmod +x dist/website
	@echo "built $(BIN) and dist/website"

line-cap:
	@violations=0; \
	for f in $$(find . -name "*.oo" -o -name "*.oot" | grep -v "/.git/" | grep -v "/bin/" | grep -v "/dist/" | grep -v "/.ooda-cache/"); do \
		n=$$(wc -l < "$$f"); \
		if [ $$n -gt 256 ]; then \
			echo "VIOLATION: $$f = $$n lines (exceeds 256)"; violations=$$((violations+1)); \
		fi; \
		code=$$(grep -vE '^[[:space:]]*(//.*)?$$' "$$f" | grep -cvE '^[[:space:]]*import[[:space:]]+"'); \
		if [ "$$code" = "0" ]; then continue; fi; \
		if [ $$n -lt 16 ]; then \
			echo "VIOLATION: $$f = $$n lines (under 16-line floor, not a shim)"; violations=$$((violations+1)); \
		fi; \
	done; \
	if [ $$violations -gt 0 ]; then echo "FAIL: $$violations files violate the Page Rule"; exit 1; fi; \
	echo "PASS: Page Rule sizing (16-256 lines, shims exempt from floor) holds"

file-law:
	@violations=0; \
	for ext in py ts rb pl json yaml toml; do \
		found=$$(find . -name "*.$$ext" -not -path "./.git/*" -not -path "./bin/*" -not -path "./dist/*" -not -path "./.ooda-cache/*" 2>/dev/null | head -3); \
		if [ -n "$$found" ]; then \
			echo "VIOLATION: .$$ext forbidden:"; echo "$$found"; violations=$$((violations+1)); \
		fi; \
	done; \
	found=$$(find . -name "*.js" -not -path "./.git/*" -not -path "./bin/*" -not -path "./dist/*" -not -path "./.ooda-cache/*" -not -path "./docs/*" 2>/dev/null | head -3); \
	if [ -n "$$found" ]; then \
		echo "VIOLATION: .js outside docs/ payload:"; echo "$$found"; violations=$$((violations+1)); \
	fi; \
	if [ $$violations -gt 0 ]; then echo "FAIL: file-law violations"; exit 1; fi; \
	echo "PASS: file law holds (site payload .js confined to docs/)"

academy:
	@failures=0; \
	for f in $$(find . -name "*.oo" -not -path "./.git/*" -not -path "./bin/*" -not -path "./dist/*" -not -path "./.ooda-cache/*"); do \
		header=$$(head -7 "$$f"); \
		missing=""; \
		echo "$$header" | grep -q "^// # "        || missing="$$missing title"; \
		echo "$$header" | grep -q "^// Logline:"  || missing="$$missing logline"; \
		echo "$$header" | grep -q "^// Setup:"    || missing="$$missing setup"; \
		echo "$$header" | grep -q "^// Beats:"    || missing="$$missing beats"; \
		if [ -n "$$missing" ]; then \
			echo "FAIL: $$f missing Academy element(s):$$missing"; failures=$$((failures+1)); \
		fi; \
	done; \
	if [ $$failures -gt 0 ]; then echo "FAIL: $$failures academy header violations"; exit 1; fi; \
	echo "PASS: academy headers hold"

density:
	@violations=0; \
	for d in $$(find . -type d -not -path "./.git*" -not -path "./bin*" -not -path "./dist*" -not -path "./.ooda-cache*"); do \
		n=$$(ls "$$d"/*.oo "$$d"/*.oot 2>/dev/null | grep -v '\*' | wc -l); \
		if [ $$n -gt 8 ]; then \
			echo "VIOLATION: $$d holds $$n pages (exceeds 8)"; violations=$$((violations+1)); \
		fi; \
	done; \
	if [ $$violations -gt 0 ]; then echo "FAIL: $$violations directories exceed density bound"; exit 1; fi; \
	echo "PASS: directory density (<= 8 pages per directory) holds"

vocab:
	@if grep -riE "sovereign|Pillar [0-9]|moonshot|dogfight|bootstrap|Stage [0-9]" --include="*.oo" --include="*.oot" . ; then \
		echo "FAIL: banned vocabulary found"; exit 1; \
	fi; \
	echo "PASS: vocabulary check holds"

shape:
	@mkdir -p .ooda-cache; : > .ooda-cache/shape.now; \
	for f in $$(find . -name "*.oo" -not -path "./.git/*" -not -path "./dist/*" -not -path "./.ooda-cache/*" -not -path "./bin/*"); do \
		awk '/^[[:space:]]*((pub|export)[[:space:]]+)?fn[[:space:]]/ { if (started) { len = NR - start; if (len > 64) print "FNLEN|$$f|" fn "|" len } started = 1; start = NR; if ($$1 == "pub" || $$1 == "export") fn = $$3; else fn = $$2; gsub(/\(.*/, "", fn) } END { if (started) { len = NR - start + 1; if (len > 64) print "FNLEN|$$f|" fn "|" len } }' "$$f" >> .ooda-cache/shape.now; \
		n=$$(grep -cE "^[[:space:]]*((pub|export)[[:space:]]+)?fn " "$$f" || true); \
		if [ "$$n" -gt 8 ]; then echo "SHAPE|$$f|-|$$n" >> .ooda-cache/shape.now; fi; \
	done; \
	violations=0; \
	while IFS='|' read -r kind path name value; do \
		[ -z "$$kind" ] && continue; \
		echo "VIOLATION: shape law $$kind|$$path|$$name|$$value"; violations=$$((violations+1)); \
	done < .ooda-cache/shape.now; \
	rm -f .ooda-cache/shape.now; \
	if [ $$violations -gt 0 ]; then echo "FAIL: $$violations shape violations"; exit 1; fi; \
	echo "PASS: shape law holds (<=8 fns/page, <=64 lines/fn)"

link-law:
	@violations=0; \
	for f in $$(find . -type l -not -path "./.git/*" 2>/dev/null); do \
		echo "VIOLATION: symbolic link $$f"; violations=$$((violations+1)); \
	done; \
	for f in $$(find . -type f -links +1 -not -path "./.git/*" 2>/dev/null); do \
		echo "VIOLATION: hard link $$f"; violations=$$((violations+1)); \
	done; \
	for f in $$(find dist bin -maxdepth 1 -type f 2>/dev/null); do \
		if [ ! -L "$$f" ] && [ "$$(stat -c '%h' "$$f")" != "1" ]; then \
			echo "VIOLATION: $$f is not a standalone binary"; violations=$$((violations+1)); \
		fi; \
	done; \
	if [ $$violations -gt 0 ]; then echo "FAIL: $$violations link law violations"; exit 1; fi; \
	echo "PASS: link law holds (no symbolic link, no hard link, standalone binaries)"

check:
	@for f in $$(find . -name "*.oo" -not -path "./.git/*" -not -path "./bin/*" -not -path "./dist/*" -not -path "./.ooda-cache/*"); do \
		$(ENV) $(RESOLVED_COMP) check "$$f" > /dev/null || exit 1; \
	done; \
	echo "PASS: ooda-compiler check holds on all .oo files"

site-gate:
	@set -e; \
	test -f docs/index.html; \
	test -f docs/CNAME; \
	test -f docs/install.sh; \
	test -f docs/.nojekyll; \
	test -f docs/js/site_ui.wasm; \
	test "$$(head -c 4 docs/js/site_ui.wasm | od -An -tx1 | tr -d ' \n')" = "0061736d"; \
	test -d docs/assets && test -d docs/styles && test -d docs/js; \
	grep -qx 'openooda.org' docs/CNAME; \
	bash -n docs/install.sh; \
	grep -oE '(src|href)="[^"]+"' docs/index.html \
		| sed -E 's/^(src|href)="([^"]+)".*/\2/' \
		| grep '^/' \
		| sed -E 's/\?.*$$//' \
		| while read -r ref; do \
			test -f "docs$$ref" || { echo "ERR broken asset ref: $$ref"; exit 1; }; \
		done; \
	for o in openOODA openOODA-core openOODA-system openOODA-apps; do \
		test -f "docs/assets/brand/$$o.svg" || { echo "ERR missing $$o.svg"; exit 1; }; \
		test -f "docs/assets/brand/$$o.png" || { echo "ERR missing $$o.png"; exit 1; }; \
	done; \
	if find docs -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.svg' \) \
			-exec grep -liE 'cloudflareinsights|google-analytics|googletagmanager|mixpanel|sentry\.io|telemetry_upload' {} + | grep .; then \
		echo "ERR third-party telemetry beacon in docs/"; exit 1; \
	fi; \
	if grep -rniE 'ringmaster|spotlight|zebes|100\.[0-9]+\.[0-9]+\.[0-9]+' docs; then \
		echo "ERR hardcoded node reference in published tree"; exit 1; \
	fi; \
	echo "PASS: site gate (refs + CNAME + icons + zero-telemetry + no-node laws)"

# The version constant, the README and the agent card must agree. A release
# whose binary claims the wrong version is worse than no release.
version-check:
	@cli=$$(grep -oE '"[0-9]+\.[0-9]+\.[0-9]+"' cli/main.oo | head -1 | tr -d '"'); \
	readme=$$(sed -n '3s/.*\*\*v\([0-9.]*\)\*\*.*/\1/p' README.md); \
	cards=$$(sed -n '4s/.*\*\*v\([0-9.]*\)\*\*.*/\1/p' AGENTS.md); \
	ok=1; \
	[ "$$cli" = "$$readme" ] || { echo "FAIL: cli/main.oo says $$cli, README says $$readme"; ok=0; }; \
	[ "$$cli" = "$$cards" ] || { echo "FAIL: cli/main.oo says $$cli, AGENTS.md says $$cards"; ok=0; }; \
	[ "$$ok" = "1" ] || exit 1; \
	echo "PASS: version $$cli is consistent across cli/main.oo, README and AGENTS.md"

verify: line-cap file-law academy density vocab shape link-law version-check check site-gate

# Stamps a content hash onto every asset reference in docs/index.html. Assets
# are edge-cached for hours while the page is cached for minutes, so without
# this a deploy can be served with the previous release's CSS and JavaScript.
assets:
	@.github/scripts/assets.sh

# Regenerates the tracker block and every live version claim in docs/index.html
# from the live state of the four canonical organizations.
tracker:
	@.github/scripts/tracker.sh

# Fails when docs/index.html no longer matches the live repository state.
tracker-check:
	@.github/scripts/tracker.sh --check

test: $(BIN) $(WASM)
	@mkdir -p .ooda-cache
	@$(ENV) $(RESOLVED_COMP) build tests/test_functional.oo -o $(TBIN) > /dev/null
	@$(ENV) $(RESOLVED_COMP) build tests/test_refusal.oo -o $(TBIN2) > /dev/null
	@PATH=/nonexistent $(ENV) ./$(TBIN) | grep -q "PASS: functional" && echo "PASS: functional suite under PATH=/nonexistent"
	@PATH=/nonexistent $(ENV) ./$(TBIN2) | grep -q "PASS: refusal" && echo "PASS: refusal suite under PATH=/nonexistent"
	@PATH=/nonexistent $(ENV) ./$(BIN) check | grep -q "verdict=PASS" && echo "PASS: website check gate"
	@rc=0; PATH=/nonexistent $(ENV) ./$(BIN) bogusverb > /dev/null 2>&1 || rc=$$?; [ "$$rc" = "2" ] && echo "PASS: unknown verb refused exit 2"
	@./$(BIN) about | grep -q "Binary       : website" && echo "PASS: about card"
	@./$(BIN) about --json | grep -q '"component":"website"' && echo "PASS: about --json"
	@./$(BIN) --version | grep -q "website" && echo "PASS: --version"
	@echo "ALL TESTS PASSED"

clean:
	@rm -rf bin dist .ooda-cache
