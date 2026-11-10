# website (openOODA) — public docs & zero-telemetry static-site conformance gate
#
# Usage:
#   make build      - oodac build cli/main.oo -> bin/website (+ dist/website copy)
#   make test       - build + run functional/refusal .oo suites and the site gate
#   make verify     - line-cap, file-law, academy, density, vocab, shape, link-law,
#                     check, site-gate
#   make site-gate  - static webroot gate over docs/ (refs, CNAME, icons, telemetry)
#   make clean      - remove build artifacts

OODA_COMPILER ?= /Projects/openOODA-core/oodac/bin/oodac
export OODA_COMPILER
OODAC_BIN ?= $(OODA_COMPILER)
export OODAC_BIN
OODA_READDIR ?= /Projects:/tmp:/usr:/lib:/lib64
OODA_WRITEDIR ?= $(CURDIR):/tmp
OO_LIST_AMBIENT_QUOTA ?= 8589934592
OODA_OODAR_ROOT ?= /Projects/openOODA-core/oodar/core
export OODA_OODAR_ROOT
BIN := bin/website
TBIN := .ooda-cache/test_functional
TBIN2 := .ooda-cache/test_refusal
SRC := $(shell find . -name '*.oo' -not -path './.git/*' -not -path './bin/*' -not -path './dist/*' -not -path './.ooda-cache/*' | sort)

ENV := OO_LIST_AMBIENT_QUOTA=$(OO_LIST_AMBIENT_QUOTA) OO_LINT_ROOTS=$(CURDIR) OODA_COMPILER=$(OODA_COMPILER) OODAC_BIN=$(OODAC_BIN) OODA_FS_READDIR=$(OODA_READDIR) OODA_FS_WRITEDIR=$(OODA_WRITEDIR) OODA_OODAR_ROOT=$(OODA_OODAR_ROOT) OODA_NO_JAIL=1

.PHONY: all build test verify clean line-cap file-law academy density vocab shape link-law check site-gate

all: build verify test

build: $(BIN)

$(BIN): $(SRC)
	@mkdir -p bin dist .ooda-cache
	$(ENV) $(OODA_COMPILER) build cli/main.oo -o $(BIN)
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
		awk '/^[[:space:]]*(pub[[:space:]]+)?fn[[:space:]]/ { if (started) { len = NR - start; if (len > 64) print "FNLEN|$$f|" fn "|" len } started = 1; start = NR; if ($$1 == "pub") fn = $$3; else fn = $$2; gsub(/\(.*/, "", fn) } END { if (started) { len = NR - start + 1; if (len > 64) print "FNLEN|$$f|" fn "|" len } }' "$$f" >> .ooda-cache/shape.now; \
		n=$$(grep -cE "^[[:space:]]*(pub[[:space:]]+)?fn " "$$f" || true); \
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
		$(ENV) $(OODA_COMPILER) check "$$f" > /dev/null || exit 1; \
	done; \
	echo "PASS: oodac check holds on all .oo files"

site-gate:
	@set -e; \
	test -f docs/index.html; \
	test -f docs/CNAME; \
	test -f docs/install.sh; \
	test -f docs/.nojekyll; \
	test -d docs/assets && test -d docs/styles && test -d docs/js; \
	grep -qx 'openooda.org' docs/CNAME; \
	sh -n docs/install.sh; \
	grep -oE '(src|href)="[^"]+"' docs/index.html \
		| sed -E 's/^(src|href)="([^"]+)".*/\2/' \
		| grep '^/' \
		| while read -r ref; do \
			test -f "docs$$ref" || { echo "ERR broken asset ref: $$ref"; exit 1; }; \
		done; \
	for o in openOODA openOODA-core openOODA-kernel openOODA-OS openOODA-tools openOODA-DE openOODA-apps openOODA-cloud openOODA-agents; do \
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

verify: line-cap file-law academy density vocab shape link-law check site-gate

test: $(BIN)
	@mkdir -p .ooda-cache
	@$(ENV) $(OODA_COMPILER) build tests/test_functional.oo -o $(TBIN) > /dev/null
	@$(ENV) $(OODA_COMPILER) build tests/test_refusal.oo -o $(TBIN2) > /dev/null
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
