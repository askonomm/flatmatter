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
import { FlatMatter, ToObject } from "flatmatter";

const fm = new FlatMatter('key: "value"');
const config = fm.serialize(new ToObject());

// {key: "value"}
```

However, you most likely want to use it with functions. Those you have to create yourself.

**TypeScript:**

```typescript
import { FlatMatterFn } from "flatmatter";

class ToUpper implements FlatMatterFn {
  name = "to-upper";

  compute(input: string): unknown {
    return input.toUpperCase();
  }
}
```

**JavaScript:**

```javascript
class ToUpper {
  name = "to-upper";

  compute(input) {
    return input.toUpperCase();
  }
}
```

A FlatMatter function has to implement the `FlatMatterFn` interface. And like I mentioned before, a thing to keep in
mind is that if the function is piped, the first argument passed to it will be the result of the previous operation.

Once you have your functions, simply pass them to FlatMatter like this:

```typescript
import { FlatMatter, ToObject } from "flatmatter";

const fm = new FlatMatter('key: "value" / to-upper', [new MyFunction()]);
const config = fm.serialize(new ToObject());

// {key: "VALUE"}
```

**Note:** if you don't like classes, you can also pass objects that have the `name` key and the `compute` callback
function.

## Serializers

FlatMatter comes built-in with two very simple serializers: `ToObject` and `ToJson`. You can create your own by
creating a class that implements the `Serializer` interface.

**TypeScript:**

```typescript
import { Serializer } from "flatmatter";

class ToJson implements Serializer {
  serialize(config: Record<string, unknown>): string {
    return JSON.stringify(config);
  }
}
```

**JavaScript:**

```javascript
class ToJson {
  serialize(config) {
    return JSON.stringify(config);
  }
}
```

**Note:** if you don't like classes, you can also pass objects that have the `serialize` callback function.
