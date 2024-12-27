# FlatMatter

A YAML-like data serialization language with support for functions. FlatMatter is considered feature-complete and is 
intentionally kept simple. Bug fixes and performance improvements are still made, of course.

Example FlatMatter:

```yaml
title: "My Blog"
last_updated: (get-content "posts") / (limit 1) / (get "publised_at") / (date "YYYY-mm-dd")
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

```shell
pip install flatmatter
``` 

## Usage

The most basic usage looks like this:

```python
from flatmatter import FlatMatter

config = FlatMatter("title: \"My blog\"").to_dict()
```
However, you most likely want to use it with functions. Those you have to create yourself. An example function
looks like this:

```python
from flatmatter import Function, fn

@fn('my-function')
class MyFunction(Function):
  def compute(self, args: list[Any]) -> Any:
    # do something with args here and return the desired result.
```

A FlatMatter function has to extend the `Function` base class, and has to use the `fn` decorator to 
name the function so that FlatMatter would know what to look for to find the function class. And like 
I mentioned before, a thing to keep in mind is that if the function is piped, its first arg will be the 
result of the previous operation.

Once you have your functions, simply pass them to FlatMatter like this:

```python
from flatmatter import FlatMatter

config = FlatMatter("...", [
  MyFunction,
  MyOtherFunction,
  etc,
])
```
