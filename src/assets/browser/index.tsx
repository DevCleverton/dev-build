import './index.scss';
const { log } = console;

log('Console works...');

const h1 = document.createElement('h1');
h1.id = 'it-works';
h1.innerText = 'IT WORKS!';
document.body.appendChild(h1);
