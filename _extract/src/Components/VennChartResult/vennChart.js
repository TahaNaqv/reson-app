import React from 'react';
import { VennDiagram, VennSeries, VennArc, VennOuterLabel } from 'reaviz';

// export const data = [
//   { key: ['A'], data: 12 },
//   { key: ['B'], data: 12 },
//   { key: ['A', 'B'], data: 2 }
// ];

export default (props) => {
    const data = [
        { key: ['Company'], data: 100 },
        { key: ['Candidate'], data: 100 },
        { key: ['Company', 'Candidate'], data: Number(props.props) }
      ];
    //   console.log(props)
    return (
        <div style={{ textAlign: 'center' }}>
          <VennDiagram width={450} height={450} data={data} series={
      <VennSeries
        colorScheme={(data, index) => {return index % 2 ? '#A9F4F0' : '#E9F7A5';}}
        arc={<VennArc strokeWidth={1} initialStyle={{opacity: 0.6}} inactiveStyle={{opacity: 0.8}} activeStyle={{opacity: 0.6}} gradient={null} mask={null} />}
        label={null} outerLabel={<VennOuterLabel fontSize={0} />} animated={false}
      />
    } className={'venn-diagram'} />
        </div>
      )
}
;