import { Component } from 'react';

export default class GlobeErrorBoundary extends Component {
  state = {
    hasError: false,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) {
      return {
        hasError: false,
        resetKey: props.resetKey,
      };
    }

    return null;
  }

  componentDidCatch(error) {
    console.warn('Globe renderer failed, using fallback map.', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
