import { Column, Entity, JoinColumn, OneToMany, PrimaryColumn } from 'typeorm';
import { OutpointRuneBalance } from './outpoint-rune-balance.entity';

@Entity({ synchronize: false })
export class TxidRune {
  @PrimaryColumn()
  id!: number;

  @Column({ nullable: true })
  tx_hash: string;

  @Column({ type: 'int8' })
  block_height: number;

  @Column({ type: 'int8' })
  tx_index: number;

  @OneToMany(
    () => OutpointRuneBalance,
    (outpointRuneBalance) => outpointRuneBalance.rune,
  )
  @JoinColumn({ name: 'tx_hash', referencedColumnName: 'tx_hash' })
  outpointRuneBalances: OutpointRuneBalance[];
}
