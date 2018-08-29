
import test from 'ava';
import { extractTextFromHtml } from './helpers';

test('extractTextFromHtml stript', t => {
    t.is(extractTextFromHtml('<script>console.log("log")</script>'), '');
    t.is(extractTextFromHtml('<div>text</div><script>console.log("log")</script>'), 'text');
    t.is(extractTextFromHtml('<div>text<script>console.log("log")</script></div>'), 'text');
})

test('extractTextFromHtml paragraphs', t => {
    t.is(extractTextFromHtml(`<p>First p.</p><p>Second p.</p>`), 'First p.\nSecond p.');
    t.is(extractTextFromHtml(`<p>First p.</p> \n\r    <p>Second p.</p>`), 'First p.\nSecond p.');
})
