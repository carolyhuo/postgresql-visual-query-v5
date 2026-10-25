import React, { useState } from 'react';
import { Col, Container, Nav, NavItem, NavLink, Row, TabContent, TabPane } from 'reactstrap';
import ResultTable from './ResultTable';
import { useAppSelector } from '../hooks';
import { translations } from '../utils/translations';
import ResultSQL from './ResultSQL';
import { withTabSwitcher } from '../hocs/withTabSwitcher';

// Component props without the HOC added props
type OwnProps = Record<string, never>;

// Props that come from the HOC
type TabSwitcherProps = {
  activeTab: string;
  toggle: (tabId: string) => void;
};

// Combined props type
type ResultTabsProps = OwnProps & TabSwitcherProps;

export const ResultTabs: React.FC<ResultTabsProps> = ({ activeTab, toggle }) => {
  const { language, result, query } = useAppSelector((state) => ({
    language: state.settings.language,
    result: state.query.result,
    query: state.query,
  }));

  const [isFloating, setIsFloating] = useState(false);
  const isCtePreview = !!query.activeTab && query.activeTab !== 'main';
  const resultTitle = isCtePreview
    ? translations[language.code].queryBuilder.ctePreviewResult
    : translations[language.code].queryBuilder.resultH;

  const handleTabSwitch = (tabId: string) => {
    if (tabId === '2') {
      setIsFloating(false);
    }
    toggle(tabId);
  };

  const handleFloatToggle = (floating: boolean) => {
    setIsFloating(floating);
  };

  return (
    <div>
      <Nav tabs>
        <NavItem>
          <NavLink
            className={`${activeTab === '1' ? 'active' : ''}`}
            onClick={() => {
              handleTabSwitch('1');
            }}
          >
            SQL
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={`${activeTab === '2' ? 'active' : ''} ${query.error ? 'text-danger' : ''}`}
            onClick={() => {
              handleTabSwitch('2');
            }}
          >
            {`${resultTitle}${result ? ` (${result.rowCount || 0})` : ''}`}
          </NavLink>
        </NavItem>
      </Nav>
      <TabContent activeTab={activeTab}>
        <TabPane tabId="1">
          <Container fluid>
            <Row>
              <Col sm="12" className="p-1 h-auto">
                <ResultSQL isFloating={isFloating} onFloatToggle={handleFloatToggle} isActive={activeTab === '1'} />
              </Col>
            </Row>
          </Container>
        </TabPane>
        <TabPane tabId="2">
          <Container fluid>
            <Row>
              <Col sm="12" className="p-1">
                <ResultTable />
              </Col>
            </Row>
          </Container>
        </TabPane>
      </TabContent>
    </div>
  );
};

export default withTabSwitcher(ResultTabs);
