import React, { Component } from "react";
import { BitcoinApi, UTXO, AccountInfo } from "./bitcoin";
import * as ledger from "./ledger";
import {
  Container,
  Jumbotron,
  Spinner,
  Button,
  Alert,
  Row,
} from "react-bootstrap";
import "./App.css";
import SelectAddresses from "./components/SelectAddresses";
import SelectOutputs from "./components/SelectOutputs";
import SignAndSend from "./components/SignAndSend";

interface Props {}

interface State {
  appBtc?: ledger.AppBtc;
  apiBtc: BitcoinApi;
  accounts: Map<string, AccountInfo>;
  outputs: Map<string, UTXO>;
  currentStep: number;
  isConnecting: boolean;
  error?: Error;
}

export default class App extends Component<Props, State> {
  state: State = {
    apiBtc: new BitcoinApi(),
    accounts: new Map<string, AccountInfo>(),
    outputs: new Map<string, UTXO>(),
    currentStep: 1,
    isConnecting: false,
  };

  constructor(props: Props) {
    super(props);
    this._next = this._next.bind(this);
    this._prev = this._prev.bind(this);
  }

  async connect() {
    this.setState({ isConnecting: true });
    try {
      // ensures that the device is connected
      // and working, user may need to exit
      // and re-enter app if device falls asleep
      const app = await ledger.connect();
      await ledger.getWalletAddress(app, 0);
      this.setState({ appBtc: app });
    } catch (error) {
      this.setState({ error: error });
    }
    this.setState({ isConnecting: false });
  }

  _next() {
    let currentStep = this.state.currentStep;
    currentStep = currentStep >= 3 ? 3 : currentStep + 1;
    this.setState({
      currentStep: currentStep,
    });
  }

  _prev() {
    let currentStep = this.state.currentStep;
    const outputs = this.state.outputs;
    currentStep =
      currentStep === 3 && outputs.size === 0
        ? 1
        : currentStep <= 0
        ? 0
        : currentStep - 1;
    this.setState({
      currentStep: currentStep,
    });
  }

  get previousButton() {
    let currentStep = this.state.currentStep;

    if (currentStep > 1) {
      return (
        <Button
          variant="secondary"
          className="float-left"
          type="button"
          onClick={this._prev}
        >
          Previous
        </Button>
      );
    }
    return null;
  }

  get nextButton() {
    let { currentStep, accounts, outputs } = this.state;

    if (
      currentStep === 1 &&
      [...accounts].reduce(
        (total, [, info]) => (total += info.checked ? 1 : 0),
        0
      ) === 0
    ) {
      return null;
    } else if (currentStep === 2 && outputs.size === 0) {
      return null;
    } else if (currentStep < 3) {
      return (
        <Button
          variant="primary"
          className="float-right"
          type="button"
          onClick={this._next}
        >
          Next
        </Button>
      );
    }
    return null;
  }

  updateAccount(addr: string, cb: (info: AccountInfo) => AccountInfo): void {
    const { accounts } = this.state;
    accounts.set(
      addr,
      cb(accounts.get(addr) || { checked: false, index: 0, value: 0 })
    );
    this.setState({ accounts });
  }

  removeAccountOutputs(addr: string) {
    const { outputs } = this.state;
    outputs.forEach((utxo) => {
      if (addr === utxo.addr) {
        outputs.delete(utxo.key());
      }
    });
    this.setState({ outputs });
  }

  addOutput(utxo: UTXO): void {
    const { outputs } = this.state;
    outputs.set(utxo.key(), utxo);
    this.setState({ outputs });
  }

  removeOutput(utxo: UTXO): void {
    const { outputs } = this.state;
    outputs.delete(utxo.key());
    this.setState({ outputs });
  }

  resetAccounts(): void {
    const { accounts } = this.state;
    accounts.forEach((info) => {
      info.checked = false;
    });
    this.setState({
      accounts: accounts,
      outputs: new Map<string, UTXO>(),
    });
  }

  render() {
    return (
      <div className="App">
        {!this.state.appBtc && (
          <Container className="p-3">
            <Jumbotron fluid>
              <h1>Connect Your Device</h1>
              <p>You may need to open the Bitcoin app.</p>
            </Jumbotron>

            <Row className="justify-content-md-center">
              {!this.state.isConnecting && (
                <Button variant="primary" onClick={() => this.connect()}>
                  Connect
                </Button>
              )}

              {this.state.isConnecting && (
                <Button variant="primary" disabled>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Loading...</span>
                </Button>
              )}
            </Row>

            {this.state.error && (
              <Row className="justify-content-md-center mt-3">
                <Alert key="ledgerErr" variant="danger">
                  {this.state.error.message}
                </Alert>
              </Row>
            )}
          </Container>
        )}
        {this.state.appBtc && (
          <Container className="p-3">
            {this.state.currentStep === 1 && (
              <SelectAddresses
                updateAccount={this.updateAccount.bind(this)}
                removeAccountOutputs={this.removeAccountOutputs.bind(this)}
                appBtc={this.state.appBtc}
                {...this.state}
              />
            )}
            {this.state.currentStep === 2 && (
              <SelectOutputs
                addOutput={this.addOutput.bind(this)}
                removeOutput={this.removeOutput.bind(this)}
                appBtc={this.state.appBtc}
                {...this.state}
              />
            )}
            {this.state.currentStep === 3 && (
              <SignAndSend
                appBtc={this.state.appBtc}
                resetAccounts={this.resetAccounts.bind(this)}
                {...this.state}
              />
            )}
            {this.previousButton}
            {this.nextButton}
          </Container>
        )}
      </div>
    );
  }
}
