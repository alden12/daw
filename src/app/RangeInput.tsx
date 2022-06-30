import { css } from '@emotion/css';
import RxFM from 'rxfm';
import { Observable } from 'rxjs';

const rangeInputStyle = css`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  grid-gap: 8px;
`;

interface RangeInputProps {
  label: string;
  setValue: (value: number) => void;
  value: Observable<number>;
  min?: number;
  max?: number;
  step?: number;
}

export const RangeInput = ({ label, setValue, value, min = 0, max = 100, step = 1 }: RangeInputProps) => {
  return <div class={rangeInputStyle}>
    <span >{label}</span>
    <input type="range" min={min} max={max} step={step} value={value} onInput={event => setValue(Number(event.target.value))} />
    <span>{value}</span>
  </div>;
};
