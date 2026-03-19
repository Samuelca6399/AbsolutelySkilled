<!-- Part of the live-dependency-resolver AbsolutelySkilled skill. Load this file when working with Python packages. -->

# Python Registry Reference

## CLI Commands

### pip index versions (primary lookup)

```bash
# List all available versions (requires pip 21.2+)
pip index versions numpy
# Output:
# numpy (2.2.3)
# Available versions: 2.2.3, 2.2.2, 2.2.1, ...
# INSTALLED: 1.26.4
# LATEST:    2.2.3

# Filter by Python version compatibility
pip index versions numpy --python-version 3.9
```

**Gotcha:** `pip index versions` was added in pip 21.2. On older versions, this command does not exist. Check pip version with `pip --version` and fall back to the PyPI API.

### pip vs pip3 vs python -m pip

```bash
# Recommended: always use python -m pip to ensure correct Python
python -m pip install numpy
python3 -m pip install numpy

# Direct pip command (may point to wrong Python)
pip install numpy      # Could be Python 2 on some systems
pip3 install numpy     # Usually Python 3, but not guaranteed

# Check which Python pip points to
pip --version
# pip 24.0 from /usr/lib/python3.12/site-packages/pip (python 3.12)
```

### pip show (installed package info)

```bash
# Check installed version and metadata
pip show numpy
# Name: numpy
# Version: 1.26.4
# Requires-Python: >=3.9
# ...
```

### pip install with version constraints

```bash
# Exact version
pip install django==4.2.20

# Minimum version
pip install django>=4.2

# Version range
pip install 'django>=4.2,<5.0'

# Latest compatible (equivalent to npm's ^)
pip install 'django~=4.2'    # >=4.2, <5.0

# Upgrade to latest
pip install --upgrade django
```

---

## PyPI JSON API

Base URL: `https://pypi.org`

### Get package metadata

```bash
# Full metadata (all versions)
curl -s https://pypi.org/pypi/numpy/json | jq '.info.version'

# Specific version
curl -s https://pypi.org/pypi/numpy/2.2.3/json | jq '.info.version'

# Python version requirement
curl -s https://pypi.org/pypi/django/json | jq '.info.requires_python'
# Output: ">=3.10"

# All available versions
curl -s https://pypi.org/pypi/numpy/json | jq '.releases | keys[]' | tail -10

# Package description and homepage
curl -s https://pypi.org/pypi/numpy/json | jq '{summary: .info.summary, home: .info.home_page}'
```

### Check package existence

```bash
# Returns 200 if exists, 404 if not
curl -s -o /dev/null -w "%{http_code}" https://pypi.org/pypi/some-package-name/json
```

---

## Virtual Environments

Always recommend virtual environments for Python projects:

```bash
# Create a venv
python -m venv .venv

# Activate (bash/zsh)
source .venv/bin/activate

# Activate (fish)
source .venv/bin/activate.fish

# Activate (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Install into the venv
pip install numpy

# Deactivate
deactivate
```

**Gotcha:** Running `pip install` without an active virtual environment installs globally (or into the user site-packages with `--user`). Always check for an active venv before suggesting installs. Look for `(.venv)` in the shell prompt or check `sys.prefix`.

---

## PEP 440 Version Specifiers

| Specifier | Meaning |
|---|---|
| `==1.2.3` | Exact version |
| `>=1.2` | Minimum version |
| `<=1.2` | Maximum version |
| `~=1.2` | Compatible release: `>=1.2, <2.0` |
| `~=1.2.3` | Compatible release: `>=1.2.3, <1.3.0` |
| `!=1.2.3` | Exclude specific version |
| `>=1.0,<2.0` | Range (comma = AND) |

### requirements.txt format

```
numpy>=1.26,<3.0
django~=4.2
requests==2.32.3
python-dateutil>=2.8
```

### pyproject.toml format (modern)

```toml
[project]
dependencies = [
    "numpy>=1.26,<3.0",
    "django~=4.2",
    "requests>=2.32",
]
```

---

## Common Gotchas

1. **`pip index versions` requires pip 21.2+** - Falls back silently to nothing on older versions. Always check pip version first or use the PyPI API.

2. **Package name normalization** - PyPI treats `-`, `_`, and `.` as equivalent in package names. `python-dateutil`, `python_dateutil`, and `python.dateutil` all resolve to the same package. Use the canonical name (hyphens) in install commands.

3. **Typosquatting** - PyPI has had malicious packages with names similar to popular ones (e.g. `python-dateutil` vs `dateutil`). Always verify the exact package name.

4. **`requires_python` field** - Check this before recommending a package version. A user on Python 3.8 cannot install Django 5.x (requires Python 3.10+).

5. **System Python vs user Python** - On macOS and many Linux distros, `python` or `python3` is the system Python. Installing packages into it can break system tools. Always use a virtual environment.

6. **pip resolver conflicts** - pip 20.3+ has a strict dependency resolver. If install fails with resolver errors, the user may need to relax version constraints or use `--no-deps` (with caution).

7. **Extras/optional dependencies** - Some packages have optional feature groups:
   ```bash
   pip install fastapi[standard]   # Includes uvicorn, httptools, etc.
   pip install pandas[excel]       # Includes openpyxl for Excel support
   ```
