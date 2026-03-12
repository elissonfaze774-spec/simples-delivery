import React from 'react';
import { toast } from 'sonner';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error('Unhandled error caught by ErrorBoundary:', error, info);
    try {
      toast.error('Ocorreu um erro inesperado. Recarregue a página.');
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold mb-2">Erro inesperado</h1>
            <p className="text-sm text-gray-600">Algo deu errado na aplicação. Recarregue a página ou contate o suporte.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
