import Hello from "."

describe('Hello', () => {
  it('should print target', (done) => {
    Hello('target').then(done);
  });
});
