// Mock email providers: simulate random failures/success
class MockProvider {
  constructor(name, failRate = 0.3) {
    this.name = name;
    this.failRate = failRate; // Probability of failure per send
  }

  async sendEmail(email) {
    // Simulate network delay
    await new Promise(res => setTimeout(res, Math.random() * 300 + 100));
    if (Math.random() < this.failRate) {
      throw new Error(`${this.name} failed to send email.`);
    }
    return { provider: this.name, status: 'sent' };
  }
}

const ProviderA = new MockProvider('Provider A', 0.2); // 20% fail
const ProviderB = new MockProvider('Provider B', 0.4); // 40% fail

module.exports = { ProviderA, ProviderB };
