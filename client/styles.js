import styled from 'styled-components'

export const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 2rem;
  box-sizing: border-box;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(to bottom right, #f8f9fa, #e9ecef);
  color: #343a40;
`;

export const ErrorText = styled.p`
  color: #e63946;
  background-color: rgba(230, 57, 70, 0.1);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  margin: 1rem 0;
  border-left: 4px solid #e63946;
`

export const Grid = styled.section`
  display: grid;
  gap: 25px;
  align-items: end;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  width: 100%;
  max-width: 900px;
  margin: 2rem auto;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 15px;
  }
`

export const GridSpan2 = styled.div`
  grid-column: span 2;
  
  @media (max-width: 480px) {
    grid-column: span 1;
  }
`

export const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  text-align: left;
  color: #495057;
`

export const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  margin-top: 4px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: #4dabf7;
    box-shadow: 0 0 0 3px rgba(77, 171, 247, 0.25);
  }
`

export const Select = styled.select`
  width: 100%;
  padding: 12px 40px 12px 16px;
  margin-top: 4px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 16px;
  background-color: white;
  cursor: pointer;
  box-sizing: border-box;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23adb5bd' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;

  &:focus {
      outline: none;
      border-color: #4dabf7;
      box-shadow: 0 0 0 3px rgba(77, 171, 247, 0.25);
  }
`

export const ConvertedBox = styled.div`
  padding: 14px 16px;
  margin-top: 4px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  min-height: 48px;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-weight: 500;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  text-align: left;
`

export const RatesTitle = styled.h2`
  margin-top: 3rem;
  margin-bottom: 1.5rem;
  font-weight: 600;
  color: #343a40;
  position: relative;
  display: inline-block;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 3px;
    background-color: #4dabf7;
    border-radius: 3px;
  }
`

export const ScrollX = styled.div`
  overflow-x: auto;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background: white;
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

export const Th = styled.th`
  
  border-bottom: 2px solid #dee2e6;
  padding: 16px;
  font-weight: 600;
  color: #343a40;
  background-color: #f8f9fa;
  position: sticky;
  top: 0;
`

export const Td = styled.td`
  border-bottom: 1px solid #f0f0f0;
  padding: 12px 16px;
  transition: background-color 0.2s;
  
  tr:hover & {
    background-color: #f1f3f5;
  }
`

export const TdRight = styled(Td)`
  text-align: right;
  font-family: 'SF Mono', 'Roboto Mono', monospace;
`