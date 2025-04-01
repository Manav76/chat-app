                             FULL STACK CHAT APPLICATION



BACKEND

Tech stack : FastAPI and Websockets

Databases: (SQL)

users Table


id : UUID
email: VARCHAR
password_hash: VARCHAR
created_at: TIMESTAMP
updated_at: TIMESTAMP


chat_sessions Table

id: UUID (Primary Key)
user_id: UUID (Foreign Key)
title: VARCHAR 
is_deleted: INTEGER
created_at: TIMESTAMP


chat_messages Table

id: UUID (Primary Key)
chat_id: UUID (Foreign Key)
role: VARCHAR (‘user’ or ‘assistant’)
content: String
timestamp: TIMESTAMP


users (1) ───────< chat_sessions (1) ───────< chat_messages


1 user -> many sessions
1 session -> many messages 






Services: Auth Service , Chat Service 


Auth Service 


APis:

Endpoint : /auth/register
Method: POST 
Description: Register user (Add more content here) , response with jwt bearer token 
Endpoint : /auth/login
Method: POST
Description: JWT Auth
Endpoint: /auth/me 
Method: GET
Description: Get Current User



Chat Service


APIs:

Endpoint: chat/sessions
Method: POST
Description: To create a new chat_session


Endpoint: chat/sessions
Method: GET
Description: To get all the chat sessions for a current user_id


Endpoint : /chat/sessions/{session_id}
Method: GET
Description: To fetch all the messages in a particular session , basically when a user clicks on a particular session we want to display all the messages associated with that session

               
SELECT role, content, timestamp
FROM chat_messages
WHERE session_id = :session_id
ORDER BY timestamp ASC;



 Endpoint: /chat/send
 Method: POST
 Description: To store the messages inside the chat_messages table
 Two distinct roles: user and assistant (gpt model)
 
User sends a message:

              INSERT INTO chat_messages (session_id, role, content, timestamp)
VALUES (:sid, 'user', :content, now());
z
LLM  model replies back:

INSERT INTO chat_messages (session_id, role, content, timestamp)
VALUES (:sid, 'assistant', :reply, now());


Endpoint: /chat/session/{id}
Method: POST
Description: To soft delete a chat session 

Endpoint: ./chat/stream
Method: POST
Description: To stream a chat response , depending on the role



FRONTEND 


Tech stack: React


Frontend Components Architecture:

<App>
 ├── <AuthProvider>     (JWT + Auth context)
 └── <Router>
      ├── /auth/login         → <LoginPage>
      ├── /auth/register      → <RegisterPage>
      └── /chat          → <ChatLayout>
             ├── <Sidebar />         ← shows past chat sessions
             ├── <ChatHeader />      ← title, logout, model options
             ├── <ChatWindow />      ← actual conversation
             └── <MessageInput />    ← text input box











Basic Application Flow

User can login if it is an already registered user , validations are added in the email form for correct format of email.

If the user is not registered then he can register using a register form , with register or login the response will have a bearer token as a part of the response , this is a sample response:
{
   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzYmE2MWM4ZC04YWFjLTQxZjItYjA1Ni1hZjg1MTc5MDczYjMiLCJleHAiOjE3NDM0OTExMzJ9.I5PoKDbtYhUurE15zj1xQCNRsRogagzf3XYI8JBoqOY",
   "token_type": "bearer",
   "user": {
       "id": "3ba61c8d-8aac-41f2-b056-af85179073b3",
       "username": "testuser1235787",
       "email": "testuser1235787@example.com",
       "created_at": "2025-04-01 06:35:29"
   }
}


   3. The bearer token is have a validity of 30 mins after that have setup a notification service that will    prompt to display a modal in the frontend that the token is about to expire , and it will prompt the user to   login again

 4. Once the user is logged it will load all the chat sessions and the messages , associated with that particular user_id using two api calls

5. Have integrated LLM using a multilevel LLM setups, have kept first option to be Gemini model and then other fallback as Open ai call , Open ai is not working currently because i have exhausted my credits on that.

6. Stream the response and store messages in chat_messages table


Optimizations and error handling in frontend
				
Scroll to bottom when new message arrives
Notification service , for jwt session expiration , handling using modal 
Steaming messages in chat
