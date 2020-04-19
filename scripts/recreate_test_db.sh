#!/bin/bash
set -euxo pipefail

psql -U postgres -c "DROP DATABASE yavin_test" || true;
psql -U postgres -c "CREATE DATABASE yavin_test";
