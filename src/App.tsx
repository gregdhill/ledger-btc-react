import React, { Component } from "react";
import { BitcoinApi, satToBtc } from "./bitcoin";
import * as ledger from "./ledger";
import {
  Container,
  Row,
  Col,
  Table,
  Button,
  Spinner,
  Jumbotron,
} from "react-bootstrap";
import "./App.css";
import Wizard from "./Wizard";

const ENTRIES_PER_PAGE = 3;

interface State {
  appBtc?: ledger.AppBtc;
  apiBtc: BitcoinApi;
  ready: boolean;
  loaded: boolean;
  accIndex: number;
  accounts: Record<string, { index: number; value: number }>;
  showModal: boolean;
  btcAddress: string;
  btcIndex: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

export default class App extends Component<{}, State> {
  state: State = {
    apiBtc: new BitcoinApi(),
    ready: false,
    loaded: false,
    accIndex: 0,
    accounts: {},
    showModal: false,
    btcAddress: "",
    btcIndex: 0,
  };

  async componentDidMount() {
    while (true) {
      try {
        const app = await ledger.connect();
        await ledger.getWalletAddress(app, 0);
        this.setState({ appBtc: app, ready: true });
        break;
      } catch (error) {
        console.log(error);
      }
      await sleep(1000);
    }

    if (this.state.ready) {
      await this.loadAccounts(ENTRIES_PER_PAGE);
    }
  }

  async loadAccounts(length: number) {
    const index = this.state.accIndex;
    let promises = [];
    for (let i = index; i < index + length; i++) {
      const addr = await ledger.getWalletAddress(this.state.appBtc!, i);
      const accounts = this.state.accounts;
      accounts[addr] = { index: i, value: 0 };

      promises.push(
        this.state.apiBtc.getAccountValue(addr).then((value) => {
          const accounts = this.state.accounts;
          accounts[addr].value = value;
          this.setState({
            accounts: accounts,
          });
        })
      );

      this.setState({
        accounts: accounts,
      });
    }
    await Promise.all(promises);
    this.setState({
      loaded: true,
      accIndex: index + length,
    });
  }

  async showModal(addr: string, index: number) {
    this.setState({
      btcAddress: addr,
      btcIndex: index,
      showModal: true,
    });
  }

  exitModal() {
    this.setState({ showModal: false });
  }

  render() {
    return (
      <div className="App">
        <Container>
          {!this.state.ready && (
            <div>
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
            </div>
          )}

          {this.state.ready && (
            <div>
              <Jumbotron>
                <h1 className="header">Select An Address</h1>
              </Jumbotron>

              <Row className="justify-content-md-center">
                <Col>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Address</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(this.state.accounts).map((addr) => {
                        return (
                          <tr
                            key={addr}
                            onClick={() =>
                              this.showModal(
                                addr,
                                this.state.accounts[addr].index
                              )
                            }
                          >
                            <td>{addr}</td>
                            <td>
                              {satToBtc(this.state.accounts[addr].value)} BTC
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </Col>
              </Row>
              <Row className="justify-content-md-center">
                {this.state.loaded && (
                  <Button
                    onClick={() => {
                      this.setState({ loaded: false });
                      this.loadAccounts(ENTRIES_PER_PAGE);
                    }}
                  >
                    Show More
                  </Button>
                )}
              </Row>
            </div>
          )}
        </Container>
        {this.state.showModal && this.state.appBtc && (
          <Wizard
            exitModal={this.exitModal.bind(this)}
            appBtc={this.state.appBtc}
            {...this.state}
          ></Wizard>
        )}
      </div>
    );
  }
}
