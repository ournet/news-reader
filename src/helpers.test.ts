
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

test('extractTextFromHtml &nbsp;', t => {
    const text = extractTextFromHtml(`.&nbsp;El a mai afirmat, în cadrul întâlnirii, referindu-se la studiul “Toward a New Social Contract: Taking on Distributional Tensions in Europe and Central Asia”, că piața forței de muncă trebuie să aibă o reglementare mai flexibilă.„Trebuie să schimbi și să extinzi securitatea socială. Trebuie să o faci universală. Vedem în special în Europa că oamenii chiar vor egalitate și securitate. Asta se aplică întregii economii, nu doar oamenilor care au locuri de muncă permanente”, a spus economistul Băncii MondialeDe asemenea, este de părere că trebuie regândit sistemul de taxe, să fie mai progresiv.&nbsp;„Am văzut în multe țări că schimbările în sistemul de taxare a dus la creșterea inegalităților și la situația unde puțini oameni, cei din top, au un nivel mai mare al veniturilor. Asta pentru că taxele pe câștigurile de capital au coborât în toate țările. Este dificil să faci asta pentru ca capitalul poate pleca ușor către alte țări, dar pentru a reduce anxietatea produsă de sentimentul nedreptății, este important să te gândești la asta. De asemenea, în ceea ce privește veniturile muncii trebuie să te gândești dacă taxele ar trebui să devină mai progresive din nou, doar dacă finanțează o siguranță universală, care este importantă”, a mai arătat Timmer.&nbsp;El este de părere că marea problemă pe taxe o reprezintă serviciile publice, respectiv sistemul de asigurare, sistemul de pensii, pentru că acestea nu lucrează pentru oamenii din noua economie.&nbsp;„Asta înseamnă că trebuie să le regândești. Asta înseamnă că trebuie să construiești un sistem care lucrează și pentru oamenii din noua economie. Asta înseamnă că sistemul de taxe ar trebui să se schimbe dacă trebuie făcut accesibil pentru a acoperi pe toată lumea. Din acest motiv văd că toate schimbările din sistemul de taxe și multe politici din Europa Centrală s-au îndreptat către generațiile bătrâne, către oamenii care au locuri de muncă permanente. Nu sunt surprins când tinerii spun: De ce trebuie să contribui la aceste sisteme? Având în vedere situația mea eu nu beneficiez și nu mă aștept să beneficiez în viitor”. Sistemele nu funcționează. Totul trebuie pus pe masă, inclusiv cota unică, când începi să regândești sistemul care funcționează pentru toată lumea”, a precizat reprezentantul Băncii Mondiale.`)

    t.is(text.indexOf('&nbsp;'), -1);
})
