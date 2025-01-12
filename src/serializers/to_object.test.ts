import { assertEquals } from "jsr:@std/assert";
import FlatMatter from "../flatmatter.ts";
import ToObject from "./to_object.ts";

Deno.test("Single-level configuration", () => {
    const fm = new FlatMatter("a: true\nb: false\nc: 1\nd: 12.5\nf: \"some string\"")

    assertEquals(fm.serialize(new ToObject), {
        a: true,
        b: false,
        c: 1,
        d: 12.5,
        f: "some string"
    });
});

Deno.test("Two-level configuration", () => {
    const fm = new FlatMatter("a.a: true\nb.b: false\nc.c: 1\nd.d: 12.5\nf.f: \"some string\"")

    assertEquals(fm.serialize(new ToObject), {
        a: {
            a: true,
        },
        b: {
            b: false,
        },
        c: {
            c: 1
        },
        d: {
            d: 12.5
        },
        f: {
            f: "some string"
        }
    });
})