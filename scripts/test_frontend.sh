#!/bin/bash
set -euxo pipefail

# HACK: This file exists because of the non-ideal project layout in which the frontend is an
# entire project within `/frontend`. These projects are *mostly* independent. In the future,
# they should be separated into two projects inside a Yarn workspace.

cd frontend
yarn test
