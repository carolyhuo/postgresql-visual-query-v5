import React, { useEffect, useState } from 'react';
import { Col, Container, Nav, NavItem, NavLink, Row, TabContent, TabPane } from 'reactstrap';
import { useAppSelector } from '../hooks';
import UsingList from './UsingList';
import { translations } from '../utils/translations';
import SetList from './SetList';
import NewQueryColumnList from './NewQueryColumnList';
import InsertQueryColumnList from './InsertQueryColumnList';
import UpdateQueryColumnList from './UpdateQueryColumnList';
import { QueryCreationTable } from './QueryCreationTable';

export const QueryTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('1');
  const { language, queryType, hasCtes } = useAppSelector((state) => ({
    language: state.settings.language,
    queryType: state.query.queryType,
    hasCtes: Boolean(state.query.ctes && state.query.ctes.length > 0),
  }));

  useEffect(() => {
    if (hasCtes && activeTab === '3') {
      setActiveTab('1');
    }
  }, [activeTab, hasCtes]);

  return (
    <div>
      {queryType === 'SELECT' && (
        <Nav tabs className="flex-row">
          <NavItem>
            <NavLink
              className={activeTab === '1' ? 'active' : ''}
              onClick={() => {
                setActiveTab('1');
              }}
            >
              {translations[language.code].queryBuilder.columnsH}
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === '3' ? 'active' : ''}
              disabled={hasCtes}
              aria-disabled={hasCtes}
              title={
                hasCtes
                  ? 'Hulgatehted (UNION) ei ole CTE-dega selles versioonis toetatud'
                  : undefined
              }
              style={hasCtes ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              onClick={() => {
                if (!hasCtes) {
                  setActiveTab('3');
                }
              }}
            >
              {translations[language.code].queryBuilder.setsH}
            </NavLink>
          </NavItem>
        </Nav>
      )}
      {queryType === 'DELETE' && (
        <Nav tabs className="flex-row">
          <NavItem>
            <NavLink
              className={activeTab === '1' ? 'active' : ''}
              onClick={() => {
                setActiveTab('1');
              }}
            >
              Filter
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === '2' ? 'active' : ''}
              onClick={() => {
                setActiveTab('2');
              }}
            >
              Join
            </NavLink>
          </NavItem>
        </Nav>
      )}
      {queryType === 'INSERT' && (
        <Nav tabs className="flex-row">
          <NavItem>
            <NavLink
              className={activeTab === '1' ? 'active' : ''}
              onClick={() => {
                setActiveTab('1');
              }}
            >
              Values
            </NavLink>
          </NavItem>
        </Nav>
      )}
      {queryType === 'UPDATE' && (
        <Nav tabs className="flex-row">
          <NavItem>
            <NavLink
              className={activeTab === '1' ? 'active' : ''}
              onClick={() => {
                setActiveTab('1');
              }}
            >
              Set values
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === '2' ? 'active' : ''}
              onClick={() => {
                setActiveTab('2');
              }}
            >
              Filter
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === '3' ? 'active' : ''}
              onClick={() => {
                setActiveTab('3');
              }}
            >
              Join
            </NavLink>
          </NavItem>
        </Nav>
      )}
      {queryType === 'SELECT' && (
        <TabContent activeTab={activeTab} style={{ minHeight: '20vh' }}>
          <TabPane tabId="1">
            <Container fluid>
              <Row>
                <Col sm="12" className="p-1">
                  <QueryCreationTable />
                </Col>
              </Row>
            </Container>
          </TabPane>
          <TabPane tabId="3">
            <Container fluid>
              <Row>
                <Col sm="12" className="p-1">
                  <SetList />
                </Col>
              </Row>
            </Container>
          </TabPane>
        </TabContent>
      )}
      {queryType === 'DELETE' && (
        <TabContent activeTab={activeTab} style={{ minHeight: '20vh' }}>
          <TabPane tabId="1">
            <Container fluid>
              <Row>
                <Col sm="12" className="p-1">
                  <NewQueryColumnList />
                </Col>
              </Row>
            </Container>
          </TabPane>
          <TabPane tabId="2">
            <Container fluid>
              <Row>
                <Col sm="12" className="p-1">
                  <UsingList />
                </Col>
              </Row>
            </Container>
          </TabPane>
        </TabContent>
      )}
      {queryType === 'INSERT' && (
        <TabContent activeTab={activeTab} style={{ minHeight: '20vh' }}>
          <TabPane tabId="1">
            <Container fluid>
              <InsertQueryColumnList />
            </Container>
          </TabPane>
        </TabContent>
      )}
      {queryType === 'UPDATE' && (
        <TabContent activeTab={activeTab} style={{ minHeight: '20vh' }}>
          <TabPane tabId="1">
            <Container fluid>
              <UpdateQueryColumnList />
            </Container>
          </TabPane>
          <TabPane tabId="2">
            <Container fluid>
              <NewQueryColumnList />
            </Container>
          </TabPane>
          <TabPane tabId="3">
            <Container fluid>
              <Row>
                <Col sm="12" className="p-1">
                  <UsingList />
                </Col>
              </Row>
            </Container>
          </TabPane>
        </TabContent>
      )}
    </div>
  );
};

export default QueryTabs;
