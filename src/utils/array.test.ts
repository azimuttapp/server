import {describe, expect, it} from 'vitest'
import {groupBy, zip} from "@/utils/array";

describe('array', () => {
    it('groupBy', () => {
        expect(groupBy([1, 2, 3], i => i % 2)).toEqual({0: [2], 1: [1, 3]})
    })
    it('zip', () => {
        expect(zip([1, 2, 3], ['a', 'b', 'c'])).toEqual([[1, 'a'], [2, 'b'], [3, 'c']])
        expect(zip([1, 2], ['a', 'b', 'c'])).toEqual([[1, 'a'], [2, 'b']])
        expect(zip([1, 2, 3], ['a', 'b'])).toEqual([[1, 'a'], [2, 'b']])
    })
})
