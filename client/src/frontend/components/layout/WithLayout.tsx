import { ReactNode } from 'react';
import { Layout } from './Layout';

// Wrapper component that applies the layout to children
export function WithLayout({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>;
}

// HOC (Higher Order Component) to wrap a component with the layout
export function withLayout<P extends object>(Component: React.ComponentType<P>) {
  return function WrappedWithLayout(props: P) {
    return (
      <Layout>
        <Component {...props} />
      </Layout>
    );
  };
}