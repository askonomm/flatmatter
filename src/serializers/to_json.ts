import {Matter, Serializer} from '../flatmatter.ts';

export default class ToJson implements Serializer {
    serialize(parsedConfig: Matter): string {
        return JSON.stringify(parsedConfig);
    }
}