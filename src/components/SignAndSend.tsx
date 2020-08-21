import React, { Component } from "react";
import { BitcoinApi, satToBtc, UTXO, AccountInfo, getTxLink } from "../bitcoin";
import * as ledger from "../ledger";
import { Button, Form, Jumbotron, Alert, Spinner } from "react-bootstrap";
import { FaExternalLinkAlt } from "react-icons/fa";

type FormControlElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

interface Props {
  appBtc: ledger.AppBtc;
  apiBtc: BitcoinApi;
  accounts: Map<string, AccountInfo>;
  outputs: Map<string, UTXO>;
  resetAccounts(): void;
}

interface State {
  // TODO: allow multiple outputs
  recipient: string;
  satoshis: number;
  txFee: number;
  isSigning: boolean;
  isSending: boolean;

  txId?: string;
  txHex?: string;
  error?: Error;
}

const LoadingButton = () => (
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
);

export default class SignAndSend extends Component<Props> {
  state: State = {
    recipient: "",
    satoshis: 0,
    txFee: 0,
    isSigning: false,
    isSending: false,
  };

  componentDidMount() {
    let total = 0;
    this.props.outputs.forEach((utxo) => (total += utxo.value));
    this.setState({ satoshis: total });
  }

  async sendTx(hex: string) {
    this.setState({ isSending: true });

    try {
      const txId = await this.props.apiBtc.broadcastTx(hex);
      this.setState({
        txId: txId,
        isSending: false,
        recipient: "",
        satoshis: 0,
        txFee: 0,
      });
      this.props.resetAccounts();
    } catch (error) {
      this.setState({
        isSending: false,
        error: error,
      });
    }
  }

  async createTransaction() {
    // clear error and previous raw tx
    this.setState({
      error: undefined,
      txHex: undefined,
      txId: undefined,
      isSigning: true,
    });
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
    this.setState({ isSigning: false });
  }

  handleChange(event: React.ChangeEvent<FormControlElement>) {
    let { name, value } = event.target;
    this.setState({
      [name]: value,
    });
  }

  render() {
    const { satoshis, txHex, txId } = this.state;
    return (
      <div>
        <Jumbotron fluid>
          <h1>Confirm & Sign</h1>
          <p>Enter the recipient and transaction fee before signing.</p>
        </Jumbotron>
        <Form>
          <Form.Group controlId="toAddress">
            <Form.Label>Recipient</Form.Label>
            <Form.Control
              type="text"
              placeholder="Address"
              value={this.state.recipient}
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
              value={this.state.txFee}
              name="txFee"
              onChange={this.handleChange.bind(this)}
            />
          </Form.Group>

          <Form.Group>
            {!this.state.isSigning && (
              <Button
                variant="primary"
                type="button"
                onClick={() => this.createTransaction()}
              >
                Sign
              </Button>
            )}
            {this.state.isSigning && <LoadingButton />}
          </Form.Group>

          {txHex && (
            <Form.Group controlId="txHex">
              <Form.Label>Raw Tx</Form.Label>
              <Form.Control type="text" value={txHex} readOnly />
            </Form.Group>
          )}

          {txHex && !txId && (
            <Form.Group controlId="sendTx">
              {!this.state.isSending && (
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => this.sendTx(txHex)}
                >
                  Send
                </Button>
              )}
              {this.state.isSending && <LoadingButton />}
            </Form.Group>
          )}

          {txId && (
            <Button onClick={() => window.open(getTxLink(txId))}>
              {txId} <FaExternalLinkAlt className="ml-2" />
            </Button>
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
