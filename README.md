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

Additionally, FlatMatter also parses FrontMatter content, meaning that a FlatMatter file like this:

```yaml
---
title: "Hello, World!"
---
Content goes here.
```

Would result in this data being created:

```json
{
  "title": "Hello, World!",
  "content": "Content goes here."
}
```

## Install

```shell
npm i flatmatter
```

## Usage

The most basic usage looks like this:

```typescript
import FlatMatter from "flatmatter";

const config = FlatMatter.config('key: "value"');

// {key: "value"}
```

However, you most likely want to use it with functions. Those you have to create yourself.

```typescript
const toUpper = {
  name: 'to-upper',
  compute: (input: string): unknown => {
    return input.toUpperCase();
  }
}
```

A FlatMatter function has to have a `name` property and a `compute` callable which takes a string and returns something. And,
like I mentioned before, a thing to keep in mind is that if the function is piped, the first argument passed to it will be
the result of the previous operation.

Once you have your functions, simply pass them to FlatMatter like this:

```typescript
import FlatMatter from "flatmatter";

const config = FlatMatter.config('key: "value" / to-upper', [toUpper]);

// {key: "VALUE"}
```
