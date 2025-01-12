# FlatMatter

A YAML-like data serialization language with support for functions. FlatMatter is considered feature-complete and is
intentionally kept simple. Bug fixes and performance improvements are still made, of course.

Example FlatMatter:

```yaml
title: "My Blog"
last_updated: (get-content "posts") / (limit 1) / (get "published_at") / (date "YYYY-mm-dd")
posts: "posts" / get-content
```

FlatMatter aims to be more-or-less syntactically compatible with YAML for the simple reason of not
needing new editor plugins to have syntax highlighting, but it differs in that there is no indentation,
but instead dots to indicate hierarchy, like `site.title` which would result in a `site` object that
contains the `title` key.

FlatMatter also supports functions, allowing you to build your own data DSL, and functions can also be piped with the
forward slash `/` character, meaning that the result of the left operation will be passed as the first argument
of the next function, and so on, to produce an end result.

## Install

To be written ...

## Usage

To be written ...
