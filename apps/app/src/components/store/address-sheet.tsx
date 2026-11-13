'use client';

import { useRef, useState } from 'react';
import { StoreIcon } from './store-icon';

import { BottomSheet, type BottomSheetHandle } from '../shared/bottom-sheet';

import { AddressFormSheet } from '../profile/address-form-sheet';
import { Button } from '../ui/button';

import type { CommerceAddress } from '../../lib/commerce-catalog-api';

type Props = {
  authenticated: boolean;
  accessToken: string | null;
  addresses: CommerceAddress[];
  selectedId?: string | null;
  onSelect: (address: CommerceAddress) => void;
  onAddresses: (addresses: CommerceAddress[]) => void;
  onLogin: () => void;
  onClose: () => void;
};

export function AddressSheet({
  authenticated,
  accessToken,
  addresses,
  selectedId,
  onSelect,
  onAddresses,
  onLogin,
  onClose,
}: Props) {
  const [showForm, setShowForm] = useState(false);

  const sheetRef = useRef<BottomSheetHandle>(null);
  const afterCloseRef = useRef<(() => void) | null>(null);

  // Close the visible sheet before running the next action.
  const closeWith = (action?: () => void) => {
    afterCloseRef.current = action ?? null;
    sheetRef.current?.close();
  };

  const handleClosed = () => {
    const action = afterCloseRef.current;
    afterCloseRef.current = null;

    if (action) {
      action();
    } else {
      onClose();
    }
  };

  if (showForm && accessToken) {
    return (
      <AddressFormSheet
        accessToken={accessToken}
        onClose={() => setShowForm(false)}
        onCreated={(created) => {
          onAddresses([created, ...addresses]);
          onSelect(created);
          onClose();
        }}
      />
    );
  }

  return (
    <BottomSheet ref={sheetRef} title="انتخاب آدرس" ariaLabel="انتخاب آدرس" onClose={handleClosed}>
      <div className="store-address-sheet">
        {!authenticated ? (
          <div className="store-address-guest">
            <p>برای مشاهده و مدیریت آدرس‌های تحویل وارد حساب شوید.</p>

            <Button onClick={() => closeWith(onLogin)}>ورود و مدیریت آدرس‌ها</Button>
          </div>
        ) : (
          <>
            {!addresses.length && <p className="store-address-empty">هنوز آدرسی ثبت نشده است.</p>}

            <div className="store-address-list" role="group" aria-label="آدرس‌های شما">
              {addresses.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selectedId === item.id}
                  onClick={() => {
                    closeWith(() => {
                      onSelect(item);
                      onClose();
                    });
                  }}
                  className={`store-address-option${
                    selectedId === item.id ? ' store-address-option--selected' : ''
                  }`}
                >
                  <span className="store-address-radio" aria-hidden="true">
                    {selectedId === item.id && <StoreIcon name="check" size={14} />}
                  </span>

                  <span className="store-address-text">
                    <strong>
                      {item.label} · {item.recipientName}
                    </strong>

                    <span>
                      {item.province}، {item.city}، {item.line1}
                    </span>
                  </span>

                  {item.isDefault && <span className="store-default-badge">پیش‌فرض</span>}
                </button>
              ))}
            </div>

            <Button
              variant="secondary"
              className="store-full-button"
              onClick={() => closeWith(() => setShowForm(true))}
            >
              <StoreIcon name="plus" size={18} />
              افزودن آدرس جدید
            </Button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
