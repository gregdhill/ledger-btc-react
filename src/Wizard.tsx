import React, { Component } from "react";
import { BitcoinApi, satToBtc, UTXO } from "./bitcoin";
import * as ledger from "./ledger";
import { Button, Modal, Table, Form, Alert } from "react-bootstrap";
import CopyToClipboard from "react-copy-to-clipboard";
import "./App.css";
import { FaClipboard } from "react-icons/fa";

export type FormControlElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

interface UtxoListProps {
  apiBtc: BitcoinApi;
  btcAddress: string;
  updateUtxos(utxos: Array<UTXO>): void;
}

interface UtxoListState {
  allUtxos: Array<UTXO>;
  useUtxos: Array<UTXO>;
  total: number;
}

class UtxoList extends Component<UtxoListProps> {
  state: UtxoListState = {
    allUtxos: [],
    useUtxos: [],
    total: 0,
  };

  async componentDidMount() {
    const { apiBtc, btcAddress } = this.props;
    const utxos = await apiBtc.getAccountUtxos(btcAddress);
    this.setState({
      allUtxos: utxos,
    });
  }

  onChange(utxo: UTXO, e: React.ChangeEvent<HTMLInputElement>) {
    let { useUtxos, total } = this.state;
    const { checked } = e.target;

    if (checked) {
      useUtxos.push(utxo);
      total += utxo.value;
    } else {
      let index = useUtxos.indexOf(utxo);
      useUtxos.splice(index, 1);
      total -= utxo.value;
    }

    this.setState({ useUtxos: useUtxos, total: total });
    this.props.updateUtxos(useUtxos);
  }

  render() {
    return (
      <Form.Group>
        <Form.Group>
          <h4 className="text-center">Select Unspent Outputs</h4>
        </Form.Group>
        <Form.Group>
          <Table hover responsive size={"md"}>
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th>TxID</th>
                <th>Index</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {this.state.allUtxos.map((utxo) => {
                return (
                  <tr key={utxo.txid}>
                    <td>
                      <input
                        type="checkbox"
                        value={utxo.txid + utxo.vout}
                        onChange={this.onChange.bind(this, utxo)}
                      />
                    </td>
                    <td>
                      <CopyToClipboard text={utxo.txid}>
                        <FaClipboard style={{ cursor: "pointer" }} />
                      </CopyToClipboard>
                    </td>
                    <td>
                      {utxo.txid.substr(0, 10)}...
                      {utxo.txid.substr(utxo.txid.length - 10)}
                    </td>
                    <td>{utxo.vout}</td>
                    <td>{satToBtc(utxo.value).toString()} BTC</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Form.Group>
      </Form.Group>
    );
  }
}

interface ConfirmProps {
  appBtc: ledger.AppBtc;
  apiBtc: BitcoinApi;
  btcAddress: string;
  btcIndex: number;
  utxos: Array<UTXO>;
}

interface ConfirmState {
  recipient: string;
  satoshis: number;
  txFee: number;
  txHex?: string;
  error?: Error;
}

class Confirm extends Component<ConfirmProps> {
  state: ConfirmState = {
    recipient: "",
    satoshis: 0,
    txFee: 0,
  };

  componentDidMount() {
    const total = this.props.utxos.reduce((total, tx) => total + tx.value, 0);
    this.setState({ satoshis: total });
  }

  async createTransaction() {
    const { recipient, satoshis, txFee } = this.state;
    const { btcIndex } = this.props;
    try {
      const { appBtc, apiBtc, utxos } = this.props;
      let txHex = await ledger.createTransaction(
        appBtc,
        btcIndex,
        satoshis - txFee,
        await Promise.all(
          utxos.map(async (utxo) => {
            return {
              hex: await apiBtc.getHexTransaction(utxo.txid),
              ...utxo,
            };
          })
        ),
        recipient
      );
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
      <Form.Group>
        <Form.Group>
          <h4>Confirm & Sign</h4>
          <p>Enter the recipient and transaction fee before signing.</p>
        </Form.Group>
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
      </Form.Group>
    );
  }
}

interface WizardProps {
  exitModal: () => void;
  appBtc: ledger.AppBtc;
  apiBtc: BitcoinApi;
  btcAddress: string;
  btcIndex: number;
}

interface WizardState {
  currentStep: number;
  utxos: UTXO[];
}

export default class Wizard extends Component<WizardProps, WizardState> {
  state: WizardState = {
    currentStep: 1,
    utxos: [],
  };

  constructor(props: WizardProps) {
    super(props);
    this._next = this._next.bind(this);
    this._prev = this._prev.bind(this);
  }

  _next() {
    let currentStep = this.state.currentStep;
    currentStep = currentStep >= 2 ? 2 : currentStep + 1;
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
        <button
          className="btn btn-secondary float-left"
          type="button"
          onClick={this._prev}
        >
          Previous
        </button>
      );
    }
    return null;
  }

  get nextButton() {
    let { currentStep } = this.state;

    if (currentStep < 2) {
      return (
        <button
          className="btn btn-primary float-right"
          type="button"
          onClick={this._next}
        >
          Next
        </button>
      );
    }
    return null;
  }

  updateUtxos(utxos: Array<UTXO>) {
    this.setState({
      utxos: utxos,
    });
  }

  render() {
    return (
      <Modal
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
        onHide={() => this.props.exitModal()}
        show={true}
      >
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            {this.props.btcAddress}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            {this.state.currentStep === 1 && (
              <UtxoList
                updateUtxos={this.updateUtxos.bind(this)}
                {...this.props}
              />
            )}
            {this.state.currentStep === 2 && (
              <Confirm utxos={this.state.utxos} {...this.props} />
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          {this.previousButton}
          {this.nextButton}
          <Button variant="danger" onClick={() => this.props.exitModal()}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}
