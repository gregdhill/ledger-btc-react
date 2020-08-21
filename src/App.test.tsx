import React from "react";
import { shallow } from "enzyme";
import App from "./App";

// https://create-react-app.dev/docs/running-tests
// https://devhints.io/enzyme

it("renders without crashing", () => {
  shallow(<App />);
});

it("should try to connect", () => {
  const wrapper = shallow(<App />);
  expect(wrapper.find("Button").text()).toEqual("Connect");
  wrapper.setState({ isConnecting: true });
  expect(wrapper.find("Button").text()).toEqual("Loading...");
});
