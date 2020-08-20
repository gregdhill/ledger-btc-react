import React, { Component } from "react";
import { BitcoinApi, satToBtc, UTXO, AccountInfo } from "../bitcoin";
import * as ledger from "../ledger";
import { Button, Form, Jumbotron, Alert } from "react-bootstrap";

type FormControlElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

interface Props {
  appBtc: ledger.AppBtc;
  apiBtc: BitcoinApi;
  accounts: Map<string, AccountInfo>;
  outputs: Map<string, UTXO>;
}

interface State {
  // TODO: allow multiple outputs
  recipient: string;
  satoshis: number;
  txFee: number;
  loading: boolean;
  txHex?: string;
  error?: Error;
}

export default class SignAndSend extends Component<Props> {
  state: State = {
    recipient: "",
    satoshis: 0,
    txFee: 0,
    loading: false,
  };

  componentDidMount() {
    let total = 0;
    this.props.outputs.forEach((utxo) => (total += utxo.value));
    this.setState({ satoshis: total });
  }

  async createTransaction() {
    // clear error and previous raw tx
    this.setState({ error: undefined, txHex: undefined });
    const { recipient, satoshis, txFee } = this.state;
    try {
      const { appBtc, apiBtc, accounts, outputs } = this.props;
      let txHex = await ledger.createTransaction(
        appBtc,
        // fee is leftover
        satoshis - txFee,
        await Promise.all(
          [...outputs].map(async ([, utxo]) => {
            return {
              hex: await apiBtc.getHexTransaction(utxo.txid),
              index: accounts.get(utxo.addr)!.index,
              ...utxo,
            };
          })
        ),
        recipient
      );
      // TODO: automatically publish?
      this.setState({
        txHex: txHex,
      });
    } catch (error) {
      this.setState({ error: error });
    }
  }

  handleChange(event: React.ChangeEvent<FormControlElement>) {
    let { name, value } = event.target;
    this.setState({
      [name]: value,
    });
  }

  render() {
    const { satoshis } = this.state;
    return (
      <div>
        <Jumbotron>
          <h1 className="header">Confirm & Sign</h1>
          <p>Enter the recipient and transaction fee before signing.</p>
        </Jumbotron>
        <Form>
          <Form.Group controlId="toAddress">
            <Form.Label>Recipient</Form.Label>
            <Form.Control
              type="text"
              placeholder="Address"
              name="recipient"
              onChange={this.handleChange.bind(this)}
            />
          </Form.Group>

          <Form.Group controlId="toAmount">
            <Form.Label>Amount</Form.Label>
            <Form.Control
              type="number"
              placeholder={satToBtc(satoshis).toString()}
              readOnly
            />
          </Form.Group>

          <Form.Group controlId="txFee">
            <Form.Label>Transaction Fee</Form.Label>
            <Form.Control
              type="number"
              placeholder="Fee"
              name="txFee"
              onChange={this.handleChange.bind(this)}
            />
          </Form.Group>

          <Form.Group>
            <Button
              variant="primary"
              type="button"
              onClick={() => this.createTransaction()}
            >
              Sign
            </Button>
          </Form.Group>

          {this.state.txHex && (
            <Form.Group controlId="toHex">
              <Form.Label>Raw Tx</Form.Label>
              <Form.Control type="text" value={this.state.txHex} readOnly />
            </Form.Group>
          )}

          {this.state.error && (
            <Form.Group>
              <Alert key="ledgerErr" variant="danger">
                {this.state.error.message}
              </Alert>
            </Form.Group>
          )}
        </Form>
      </div>
    );
  }
}
