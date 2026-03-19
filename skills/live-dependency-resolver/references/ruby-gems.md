<!-- Part of the live-dependency-resolver AbsolutelySkilled skill. Load this file when working with Ruby gems. -->

# Ruby Gems Reference

## CLI Commands

### gem search (primary lookup)

```bash
# Search for exact gem name (use anchors for exact match)
gem search ^rails$ --remote
# Output: rails (8.0.2)

# Without anchors, matches partial names (returns many results)
gem search rails --remote | head -5
# Output:
# rails (8.0.2)
# rails-admin (0.0.1)
# rails-api (0.4.1)
# ...
```

**Gotcha:** Always use `^name$` regex anchors for exact matches. `gem search rails` without anchors returns dozens of gems with "rails" anywhere in the name.

### gem info

```bash
# Detailed info about a gem
gem info rails --remote
# Output includes: version, authors, homepage, license, dependencies

# List all remote versions
gem list rails --remote --all | head -5
# rails (8.0.2, 8.0.1, 8.0.0, 7.2.2.1, ...)
```

### gem install

```bash
# Install latest version
gem install rails

# Install specific version
gem install rails -v 7.2.2.1

# Install with version constraint
gem install rails -v '~> 7.2'

# Install without docs (faster)
gem install rails --no-document

# Install into a specific directory
gem install rails --install-dir ./vendor/gems
```

### gem specification

```bash
# Get detailed spec info in YAML
gem specification rails --remote

# Get specific field
gem specification rails --remote --field version
# Output: 8.0.2

# Get dependencies
gem specification rails --remote --field dependencies
```

---

## RubyGems.org API

Base URL: `https://rubygems.org`

### Get gem metadata

```bash
# Get gem info as JSON
curl -s https://rubygems.org/api/v1/gems/rails.json | jq '.version'
# Output: "8.0.2"

# Get all versions
curl -s https://rubygems.org/api/v1/versions/rails.json | jq '.[0:5] | .[].number'

# Get dependencies for a specific version
curl -s https://rubygems.org/api/v1/versions/rails/latest.json | jq '.version'

# Search for gems
curl -s 'https://rubygems.org/api/v1/search.json?query=rails&page=1' | jq '.[0:3] | .[].name'

# Get download count
curl -s https://rubygems.org/api/v1/gems/rails.json | jq '.downloads'
```

### Check gem existence

```bash
# Returns 200 if exists, 404 if not
curl -s -o /dev/null -w "%{http_code}" https://rubygems.org/api/v1/gems/some-gem-name.json
```

---

## Bundler vs gem install

### When to use which

- `gem install <name>` - Install a standalone tool or global gem (e.g. `rails`, `rubocop`)
- `bundle add <name>` - Add a dependency to a project's `Gemfile` and install it
- `bundle install` - Install all dependencies from `Gemfile.lock`
- `bundle exec <cmd>` - Run a command using the project's bundled gems

### Gemfile format

```ruby
source 'https://rubygems.org'

# Latest version
gem 'rails'

# Specific version
gem 'rails', '8.0.2'

# Version constraints
gem 'rails', '~> 7.2'        # >= 7.2, < 8.0
gem 'rails', '>= 7.0', '< 9'

# Development only
gem 'rspec', group: :development
gem 'rubocop', group: [:development, :test]

# GitHub source
gem 'my-gem', git: 'https://github.com/user/repo'

# Platform-specific
gem 'sqlite3', platforms: [:ruby, :mswin]
```

### bundle add

```bash
# Add to Gemfile and install
bundle add rails

# Add specific version
bundle add rails --version "~> 7.2"

# Add to a group
bundle add rspec --group development

# Skip install (just modify Gemfile)
bundle add rails --skip-install
```

---

## Version Constraints

Ruby gems use these version constraint operators:

| Constraint | Meaning |
|---|---|
| `= 1.2.3` | Exact version |
| `!= 1.2.3` | Any version except |
| `> 1.2.3` | Greater than |
| `>= 1.2.3` | Greater than or equal |
| `< 2.0` | Less than |
| `<= 2.0` | Less than or equal |
| `~> 1.2` | Pessimistic: `>= 1.2, < 2.0` |
| `~> 1.2.3` | Pessimistic: `>= 1.2.3, < 1.3.0` |

The pessimistic operator (`~>`) is the most common. It's similar to npm's `^` for major versions and `~` for patch versions.

---

## Platform Gems

Some gems have platform-specific variants (e.g. native extensions):

```bash
# Check available platforms for a gem
curl -s https://rubygems.org/api/v1/versions/nokogiri.json | \
  jq '[.[0:5] | .[] | {number, platform}]'

# Common platforms:
# ruby       - Pure Ruby (works everywhere)
# java       - JRuby
# x86_64-linux
# x86_64-darwin
# arm64-darwin
# x64-mingw-ucrt (Windows)
```

Bundler automatically selects the correct platform variant. When specifying versions manually, be aware that platform-specific gems may have different available versions.

---

## Common Gotchas

1. **`gem search` without anchors matches partial names** - `gem search rail` returns `rails`, `rails-api`, `railties`, etc. Always use `^name$` for exact matches.

2. **Bundler lockfile platform** - `Gemfile.lock` records the platform. Moving between architectures (x86 to ARM) requires `bundle lock --add-platform <platform>`.

3. **System Ruby vs user Ruby** - On macOS, the system Ruby (`/usr/bin/ruby`) is managed by Apple and should not have gems installed into it. Use rbenv, rvm, or asdf to manage Ruby versions.

4. **`require` name differs from gem name** - The gem `activerecord` is required as `active_record`. The gem `rspec-core` is required as `rspec/core`. Check the gem's README for the correct require path.

5. **Yanked gems** - Gem authors can yank versions from RubyGems.org. Yanked versions won't appear in search results but may still be in existing `Gemfile.lock` files.

6. **Pre-release versions** - Pre-release versions (e.g. `8.0.0.rc1`) are not installed by default. Use `gem install rails --pre` or specify the exact version.

7. **Native extension build failures** - Gems with C extensions (nokogiri, pg, mysql2) require system libraries. Common fixes:
   ```bash
   # nokogiri
   brew install libxml2 libxslt  # macOS

   # pg (PostgreSQL)
   brew install postgresql       # macOS

   # mysql2
   brew install mysql            # macOS
   ```
