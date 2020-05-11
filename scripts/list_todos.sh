#!/bin/bash
set -euo pipefail

grep -R --color=always --exclude-dir={node_modules,build,coverage,scripts} 'TODO\|FIXME\|HACK'
