export default function Hello(target?: string) {
  console.log('hello,', target || 'world');
}

Hello();
