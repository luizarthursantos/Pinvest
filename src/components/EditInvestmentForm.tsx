import { useState } from 'react';
import { useStore } from '../store/useStore';
import ComboBox from './ComboBox';
import type { InvestmentType } from '../types';

interface Props {
  investmentId: string;
  onClose: () => void;
}

export default function EditInvestmentForm({ investmentId, onClose }: Props) {
  const inv = useStore((s) => s.investments.find((i) => i.id === investmentId));
  const { updateInvestment, groups, subgroups, custodies, addGroup, addSubgroup, addCustody } =
    useStore();

  const [name, setName] = useState(inv?.name ?? '');
  const [type, setType] = useState<InvestmentType>(inv?.type ?? 'stock');
  const [ticker, setTicker] = useState(inv?.ticker ?? '');
  const [manualPrice, setManualPrice] = useState(String(inv?.manualPrice ?? inv?.currentPrice ?? ''));
  const [quantity, setQuantity] = useState(String(inv?.quantity ?? ''));
  const [group, setGroup] = useState(inv?.group ?? '');
  const [subgroup, setSubgroup] = useState(inv?.subgroup ?? '');
  const [custody, setCustody] = useState(inv?.custody ?? '');
  const [targetTotal, setTargetTotal] = useState(inv?.targetTotalWeight != null ? String(inv.targetTotalWeight) : '');
  const [targetType, setTargetType] = useState(inv?.targetTypeWeight != null ? String(inv.targetTypeWeight) : '');

  if (!inv) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = type === 'other' ? parseFloat(manualPrice) || 0 : inv.currentPrice;
    updateInvestment(investmentId, {
      name,
      type,
      ticker: type === 'stock' ? ticker.toUpperCase() : undefined,
      quantity: parseFloat(quantity) || 0,
      manualPrice: type === 'other' ? price : undefined,
      currentPrice: type === 'other' ? price : inv.currentPrice,
      group,
      subgroup,
      custody,
      targetTotalWeight: targetTotal !== '' ? parseFloat(targetTotal) : undefined,
      targetTypeWeight: targetType !== '' ? parseFloat(targetType) : undefined,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Edit Investment</h2>

        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />

        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value as InvestmentType)}>
          <option value="stock">Stock</option>
          <option value="other">Other</option>
        </select>

        {type === 'stock' && (
          <>
            <label>Ticker</label>
            <input value={ticker} onChange={(e) => setTicker(e.target.value)} required />
          </>
        )}

        {type === 'other' && (
          <>
            <label>Price</label>
            <input
              type="number"
              step="0.01"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              required
            />
          </>
        )}

        <label>Quantity</label>
        <input
          type="number"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />

        <label>Group</label>
        <ComboBox
          options={groups}
          value={group}
          onChange={setGroup}
          onAdd={addGroup}
          placeholder="Select or create group"
        />

        <label>Subgroup</label>
        <ComboBox
          options={subgroups}
          value={subgroup}
          onChange={setSubgroup}
          onAdd={addSubgroup}
          placeholder="Select or create subgroup"
        />

        <label>Custody</label>
        <ComboBox
          options={custodies}
          value={custody}
          onChange={setCustody}
          onAdd={addCustody}
          placeholder="Select or create custody"
        />

        <label>Target Total Weight (%)</label>
        <input
          type="number"
          step="0.01"
          value={targetTotal}
          onChange={(e) => setTargetTotal(e.target.value)}
        />

        <label>Target Type Weight (%)</label>
        <input
          type="number"
          step="0.01"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
        />

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
