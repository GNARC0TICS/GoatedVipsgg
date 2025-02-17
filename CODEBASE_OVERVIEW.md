Table wager_races {
  id UUID PRIMARY KEY
  status VARCHAR
  start_date TIMESTAMP
  end_date TIMESTAMP
  prize_pool DECIMAL
}

Table users {
  id UUID PRIMARY KEY
  telegram_id VARCHAR UNIQUE
  username VARCHAR
  verification_status VARCHAR
  created_at TIMESTAMP
}

Table transformation_logs {
  id UUID PRIMARY KEY
  type VARCHAR
  message TEXT
  duration_ms INTEGER
  created_at TIMESTAMP
}

## Development Summary and Future Considerations

### Application Overview
The GoatedVIPs platform is a sophisticated affiliate marketing system with several key components:

1. **Core Infrastructure**
- Dual-server architecture (main + webhook) for scalability
- Real-time data synchronization via WebSocket
- Secure authentication with Telegram verification
- PostgreSQL database with Drizzle ORM
- React frontend with modern UI components

2. **Key Features**
- Race tracking and leaderboard system
- VIP program management
- Admin dashboard and controls
- Real-time notifications
- User verification through Telegram

### Development Workflow
When adding new features or modifications:

1. **Initial Steps**
- Review relevant components in `server/` and `client/src/`
- Check existing implementations in similar features
- Consider impact on real-time synchronization
- Verify database schema compatibility

2. **Implementation Guidelines**
- Add new routes in `server/routes.ts`
- Create UI components in `client/src/components`
- Update types in `db/schema.ts`
- Add new pages in `client/src/pages`
- Implement API endpoints in appropriate route handlers

3. **Testing Considerations**
- Test WebSocket connections for real-time features
- Verify Telegram bot interactions
- Check admin dashboard functionality
- Ensure mobile responsiveness
- Validate rate limiting and security measures

### Pending Features and Improvements

1. **Documentation Needs**
- [ ] API documentation with endpoint descriptions
- [ ] Sequence diagrams for key workflows
- [ ] Performance optimization guide
- [ ] Deployment and scaling documentation

2. **Technical Improvements**
- [ ] Enhanced error handling and logging
- [ ] Improved cache implementation
- [ ] Better TypeScript type coverage
- [ ] Automated testing suite
- [ ] Performance monitoring tools

3. **Feature Enhancements**
- [ ] Advanced analytics dashboard
- [ ] Enhanced VIP program features
- [ ] Improved user notification system
- [ ] Extended admin controls
- [ ] Additional payment integrations

### Best Practices for New Features

1. **Architecture Considerations**
- Maintain separation of concerns
- Follow established patterns for new components
- Consider scalability in design
- Implement proper error handling
- Add appropriate logging

2. **Performance Guidelines**
- Implement caching where appropriate
- Optimize database queries
- Use proper indexing
- Consider bulk operations
- Monitor WebSocket connections

3. **Security Checklist**
- Implement rate limiting
- Validate all inputs
- Use proper authentication
- Follow secure coding practices
- Add audit logging

### Critical Components to Consider

1. **Real-time Systems**
- WebSocket server in `server/index.ts`
- Event handling system
- Connection management
- Fallback mechanisms

2. **Authentication Flow**
- Telegram verification process
- Session management
- Admin authentication
- Role-based access control

3. **Data Management**
- Database schema updates
- Data transformation logic
- Caching strategy
- Query optimization

### Future Scalability Considerations

1. **Infrastructure**
- Consider microservices architecture
- Implement load balancing
- Add redundancy
- Improve monitoring

2. **Database**
- Plan for sharding
- Implement read replicas
- Optimize indexes
- Add archival strategy

3. **Application**
- Implement feature flags
- Add A/B testing capability
- Improve error recovery
- Enhance monitoring

This summary provides a comprehensive overview of the application's current state and future development path. When implementing new features, always consider the existing architecture and patterns to maintain consistency and reliability.