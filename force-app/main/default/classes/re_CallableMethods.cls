public with sharing class re_CallableMethods implements Callable {
  public String getCryptoEscalationEmail() {
    System.debug('Escalate to cypto-escalations@global.com');
    return null;
  }

  // Dispatch actual methods
  public Object call(String action, Map<String, Object> args) {
    switch on action {
      when 'getCryptoEscalationEmail' {
        return this.getCryptoEscalationEmail();
      }
      when else {
        throw new re_IllegalMethodCallException('Method not implemented');
      }
    }
  }

  public class re_IllegalMethodCallException extends Exception {
  }
}
