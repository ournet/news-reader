
import test from 'ava';
import { extractTextFromHtml } from './helpers';

test('extractTextFromHtml stript', t => {
    t.is(extractTextFromHtml('<script>console.log("log")</script>'), '');
    t.is(extractTextFromHtml('<div>text</div><script>console.log("log")</script>'), 'text');
    t.is(extractTextFromHtml('<div>text<script>console.log("log")</script></div>'), 'text');
})
