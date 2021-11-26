import fetch from 'node-fetch';

export default function Hello(target?: string) {
  return fetch('https://reqres.in/api/users')
    .then(() => console.log('hello,', target || 'world'));
}

Hello();
