'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { errorMessage, useRuntime } from '@rhc/ui';
import type { AdminCapabilities } from './capability-scopes';
import { CapabilityRequestCoordinator } from './capability-request-coordinator';

export function useAdminCapabilities() {
  const { request, dataRevision } = useRuntime();
  const [state, setState] = useState<{ data?: AdminCapabilities; error?: string; loading: boolean }>({ loading: true });
  const [revision, setRevision] = useState(0);
  const coordinator = useRef(new CapabilityRequestCoordinator<AdminCapabilities>());
  useLayoutEffect(() => {
    const instance = coordinator.current;
    return () => instance.invalidate();
  }, []);
  const load = useCallback((signal?: AbortSignal) => request<AdminCapabilities>('/admin/capabilities', { signal }), [request]);
  useEffect(() => {
    const instance = coordinator.current;
    const controller = new AbortController();
    const requestId = instance.begin();
    setState((current) => ({ ...current, loading: true, error: undefined }));
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted && instance.commitSuccess(requestId, data)) {
          setState({ data, loading: false });
        }
      })
      .catch((cause) => {
        const message = errorMessage(cause);
        if (!controller.signal.aborted && instance.commitError(requestId, message)) {
          setState((current) => ({ ...current, error: message, loading: false }));
        }
      });
    return () => {
      instance.invalidate();
      controller.abort();
    };
  }, [dataRevision, load, revision]);
  const revalidate = useCallback(async () => {
    const requestId = coordinator.current.begin();
    setState((current) => ({ ...current, loading: true, error: undefined }));
    try {
      const data = await load();
      if (!coordinator.current.commitSuccess(requestId, data)) return null;
      setState({ data, loading: false });
      return data;
    } catch (cause) {
      const message = errorMessage(cause);
      if (!coordinator.current.commitError(requestId, message)) return null;
      setState((current) => ({ ...current, error: message, loading: false }));
      return null;
    }
  }, [load]);
  const reload = () => {
    coordinator.current.invalidate();
    setRevision((value) => value + 1);
  };
  return { ...state, reload, revalidate };
}
