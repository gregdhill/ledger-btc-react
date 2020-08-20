import React, { Component } from "react";
import { BitcoinApi, UTXO, AccountInfo } from "./bitcoin";
import * as ledger from "./ledger";
import { Container, Jumbotron, Spinner, Button } from "react-bootstrap";
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
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

export default class App extends Component<Props, State> {
  state: State = {
    apiBtc: new BitcoinApi(),
    accounts: new Map<string, AccountInfo>(),
    outputs: new Map<string, UTXO>(),
    currentStep: 1,
  };

  constructor(props: Props) {
    super(props);
    // TODO: hide buttons pending form validation
    this._next = this._next.bind(this);
    this._prev = this._prev.bind(this);
  }

  async componentDidMount() {
    while (true) {
      try {
        // ensures that the device is connected
        // and working, user may need to exit
        // and re-enter app if device falls asleep
        const app = await ledger.connect();
        await ledger.getWalletAddress(app, 0);
        this.setState({ appBtc: app });
        break;
      } catch (error) {
        // console.log(error);
      }
      await sleep(1000);
    }
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
    currentStep = currentStep <= 0 ? 0 : currentStep - 1;
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
    let { currentStep } = this.state;

    if (currentStep < 3) {
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

  render() {
    return (
      <div className="App">
        {!this.state.appBtc && (
          <Container>
            <Jumbotron>
              <h1 className="header">Connect Your Device</h1>
              <p>You may need to open the Bitcoin app.</p>
            </Jumbotron>
            <Spinner
              as="span"
              animation="border"
              role="status"
              aria-hidden="true"
            />
          </Container>
        )}
        {this.state.appBtc && (
          <Container>
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
              <SignAndSend appBtc={this.state.appBtc} {...this.state} />
            )}
            {this.previousButton}
            {this.nextButton}
          </Container>
        )}
      </div>
    );
  }
}
