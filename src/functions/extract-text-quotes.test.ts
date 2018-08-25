
import test from 'ava';
import { extractTextQuotes } from './extract-text-quotes';


test('no persons', t => {
    const text = '"Cread ca am ceva de spus - sau poate nu" a spus Ion Vasilica';
    const lang = 'ro';

    t.deepEqual(extractTextQuotes(text, lang, []), []);
})

test('has persons', t => {
    const text = '"Cread ca am ceva de spus - sau poate nu" a spus Ion Vasilica';
    const lang = 'ro';

    t.deepEqual(extractTextQuotes(text, lang, [{ index: 49, id: '1' }]),
        [{
            index: 1,
            text: 'Cread ca am ceva de spus - sau poate nu',
            author: { index: 49, id: '1' }
        }]);
})

