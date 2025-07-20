#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <math.h>

#ifdef _WIN32
  #include <windows.h>
  #define SLEEP(x) Sleep(1000 * (x))
#else
  #include <unistd.h>
  #define SLEEP(x) sleep(x)
#endif

#define BOARD_SIZE 8

char board[BOARD_SIZE][BOARD_SIZE];
int turn = 0;
char lastMessage[100] = "Game started.";
char capturedWhite[100] = "";
char capturedBlack[100] = "";

void init_board();
void write_board_to_file();
const char* piece_symbol(char p);
int algebraic_to_index(const char *pos, int *row, int *col);
int is_valid_move(int sr, int sc, int dr, int dc);
int valid_pawn_move(int sr, int sc, int dr, int dc);
int valid_rook_move(int sr, int sc, int dr, int dc);
int valid_knight_move(int sr, int sc, int dr, int dc);
int valid_bishop_move(int sr, int sc, int dr, int dc);
int valid_queen_move(int sr, int sc, int dr, int dc);
int valid_king_move(int sr, int sc, int dr, int dc);
int is_path_clear(int sr, int sc, int dr, int dc);
int is_valid_move_board(int sr, int sc, int dr, int dc, char b[BOARD_SIZE][BOARD_SIZE]);
int is_in_check_board(int player, char b[BOARD_SIZE][BOARD_SIZE]);
int is_in_check(int player);
int is_checkmate(int player);

int main() {
    init_board();
    write_board_to_file();
    printf("Chess game started. Waiting for moves...\n");
    while (1) {
        FILE *fp = fopen("input.txt", "r");
        if (fp != NULL) {
            char move[20];
            if (fgets(move, sizeof(move), fp) != NULL) {
                move[strcspn(move, "\r\n")] = 0;
                if (strlen(move) >= 5) {
                    char source[3], dest[3];
                    sscanf(move, "%2s %2s", source, dest);
                    int sr, sc, dr, dc;
                    if (algebraic_to_index(source, &sr, &sc) && algebraic_to_index(dest, &dr, &dc)) {
                        char piece = board[sr][sc];
                        if (piece == ' ') {
                            snprintf(lastMessage, sizeof(lastMessage), "No piece at %s.", source);
                        } else {
                            if ((turn == 0 && isupper(piece)) || (turn == 1 && islower(piece))) {
                                if (is_valid_move(sr, sc, dr, dc)) {
                                    char captured = board[dr][dc];
                                    char temp = captured;
                                    board[dr][dc] = board[sr][sc];
                                    board[sr][sc] = ' ';
                                    if (is_in_check(turn)) {
                                        board[sr][sc] = board[dr][dc];
                                        board[dr][dc] = temp;
                                        snprintf(lastMessage, sizeof(lastMessage), "Illegal move: King would be in check.");
                                    } else {
                                        if (temp != ' ') {
                                            if (isupper(temp)) {
                                                strncat(capturedWhite, piece_symbol(temp), sizeof(capturedWhite)-strlen(capturedWhite)-1);
                                                strncat(capturedWhite, " ", sizeof(capturedWhite)-strlen(capturedWhite)-1);
                                            } else {
                                                strncat(capturedBlack, piece_symbol(temp), sizeof(capturedBlack)-strlen(capturedBlack)-1);
                                                strncat(capturedBlack, " ", sizeof(capturedBlack)-strlen(capturedBlack)-1);
                                            }
                                        }
                                        snprintf(lastMessage, sizeof(lastMessage), "Move %s to %s executed.", source, dest);
                                        turn = 1 - turn;
                                        if (is_in_check(turn))
                                            snprintf(lastMessage, sizeof(lastMessage), "Check! %s is in check.", (turn == 0 ? "White" : "Black"));
                                        if (is_checkmate(turn)) {
                                            snprintf(lastMessage, sizeof(lastMessage), "Checkmate! %s wins!", (turn == 0 ? "Black" : "White"));
                                            write_board_to_file();
                                            exit(0);
                                        }
                                    }
                                } else {
                                    snprintf(lastMessage, sizeof(lastMessage), "Invalid move from %s to %s.", source, dest);
                                }
                            } else {
                                snprintf(lastMessage, sizeof(lastMessage), "It's not your turn.");
                            }
                        }
                    } else {
                        snprintf(lastMessage, sizeof(lastMessage), "Invalid move format. Use e.g., \"e2 e4\".");
                    }
                }
            }
            fclose(fp);
            fp = fopen("input.txt", "w");
            if (fp) fclose(fp);
            write_board_to_file();
        }
        SLEEP(1);
    }
    return 0;
}

void init_board() {
    board[0][0]='r';board[0][1]='n';board[0][2]='b';board[0][3]='q';
    board[0][4]='k';board[0][5]='b';board[0][6]='n';board[0][7]='r';
    for(int i=0;i<BOARD_SIZE;i++) board[1][i]='p';
    for(int i=2;i<6;i++) for(int j=0;j<BOARD_SIZE;j++) board[i][j]=' ';
    for(int i=0;i<BOARD_SIZE;i++) board[6][i]='P';
    board[7][0]='R';board[7][1]='N';board[7][2]='B';board[7][3]='Q';
    board[7][4]='K';board[7][5]='B';board[7][6]='N';board[7][7]='R';
}

const char* piece_symbol(char p) {
    switch(p){
        case 'K': return "♔"; case 'Q': return "♕";
        case 'R': return "♖"; case 'B': return "♗";
        case 'N': return "♘"; case 'P': return "♙";
        case 'k': return "♚"; case 'q': return "♛";
        case 'r': return "♜"; case 'b': return "♝";
        case 'n': return "♞"; case 'p': return "♟";
        default: return " ";
    }
}

void write_board_to_file() {
    FILE *fp=fopen("board.txt","w");
    if(!fp) return;
    fprintf(fp,"{\n  \"board\": [\n");
    for(int i=0;i<BOARD_SIZE;i++){
        fprintf(fp,"    [");
        for(int j=0;j<BOARD_SIZE;j++){
            fprintf(fp,"\"%s\"",piece_symbol(board[i][j]));
            if(j<BOARD_SIZE-1) fprintf(fp,", ");
        }
        fprintf(fp,"]%s\n",i<BOARD_SIZE-1?",":"");
    }
    fprintf(fp,"  ],\n  \"turn\": \"%s\",\n",turn==0?"White":"Black");
    fprintf(fp,"  \"status\": \"%s\",\n",lastMessage);
    fprintf(fp,"  \"capturedWhite\": \"%s\",\n",capturedWhite);
    fprintf(fp,"  \"capturedBlack\": \"%s\"\n}\n");
    fclose(fp);
}

int algebraic_to_index(const char *pos,int *row,int *col){
    if(strlen(pos)!=2) return 0;
    char f=pos[0],r=pos[1];
    if(f<'a'||f>'h'||r<'1'||r>'8') return 0;
    *col=f-'a';*row=8-(r-'0');return 1;
}

int is_valid_move(int sr,int sc,int dr,int dc){
    char p=board[sr][sc];
    if(dr<0||dr>=BOARD_SIZE||dc<0||dc>=BOARD_SIZE) return 0;
    if(board[dr][dc]!=' '&&((isupper(p)&&isupper(board[dr][dc]))||(islower(p)&&islower(board[dr][dc])))) return 0;
    switch(tolower(p)){
        case 'p': return valid_pawn_move(sr,sc,dr,dc);
        case 'r': return valid_rook_move(sr,sc,dr,dc);
        case 'n': return valid_knight_move(sr,sc,dr,dc);
        case 'b': return valid_bishop_move(sr,sc,dr,dc);
        case 'q': return valid_queen_move(sr,sc,dr,dc);
        case 'k': return valid_king_move(sr,sc,dr,dc);
        default: return 0;
    }
}

int valid_pawn_move(int sr,int sc,int dr,int dc){
    char p=board[sr][sc];int d=isupper(p)?-1:1;
    if(sc==dc&&board[dr][dc]==' '){
        if(dr==sr+d) return 1;
        if((isupper(p)&&sr==6)||(islower(p)&&sr==1))
            if(dr==sr+2*d&&board[sr+d][sc]==' ') return 1;
    }
    if(abs(dc-sc)==1&&dr==sr+d&&board[dr][dc]!=' '){
        if((isupper(p)&&islower(board[dr][dc]))||(islower(p)&&isupper(board[dr][dc]))) return 1;
    }
    return 0;
}

int valid_rook_move(int sr,int sc,int dr,int dc){
    return (sr==dr||sc==dc)&&is_path_clear(sr,sc,dr,dc);
}

int valid_knight_move(int sr,int sc,int dr,int dc){
    int r=abs(dr-sr),c=abs(dc-sc);
    return (r==2&&c==1)||(r==1&&c==2);
}

int valid_bishop_move(int sr,int sc,int dr,int dc){
    return abs(dr-sr)==abs(dc-sc)&&is_path_clear(sr,sc,dr,dc);
}

int valid_queen_move(int sr,int sc,int dr,int dc){
    if(sr==dr||sc==dc) return valid_rook_move(sr,sc,dr,dc);
    if(abs(dr-sr)==abs(dc-sc)) return valid_bishop_move(sr,sc,dr,dc);
    return 0;
}

int valid_king_move(int sr,int sc,int dr,int dc){
    return abs(dr-sr)<=1&&abs(dc-sc)<=1;
}

int is_path_clear(int sr,int sc,int dr,int dc){
    int rs=(dr-sr)==0?0:(dr-sr)/abs(dr-sr),
        cs=(dc-sc)==0?0:(dc-sc)/abs(dc-sc),
        r=sr+rs,c=sc+cs;
    while(r!=dr||c!=dc){
        if(board[r][c]!=' ') return 0;
        r+=rs;c+=cs;
    }
    return 1;
}

int is_valid_move_board(int sr,int sc,int dr,int dc,char b[BOARD_SIZE][BOARD_SIZE]){
    char p=b[sr][sc];
    if(dr<0||dr>=BOARD_SIZE||dc<0||dc>=BOARD_SIZE) return 0;
    if(b[dr][dc]!=' '&&((isupper(p)&&isupper(b[dr][dc]))||(islower(p)&&islower(b[dr][dc])))) return 0;
    switch(tolower(p)){
        case 'p':{
            int d=isupper(p)?-1:1;
            if(sc==dc&&b[dr][dc]==' '){
                if(dr==sr+d) return 1;
                if((isupper(p)&&sr==6)||(islower(p)&&sr==1))
                    if(dr==sr+2*d&&b[sr+d][sc]==' ') return 1;
            }
            if(abs(dc-sc)==1&&dr==sr+d&&b[dr][dc]!=' '){
                if((isupper(p)&&islower(b[dr][dc]))||(islower(p)&&isupper(b[dr][dc]))) return 1;
            }
            return 0;
        }
        case 'r': return (sr==dr||sc==dc)&&is_path_clear(sr,sc,dr,dc);
        case 'n':{int r=abs(dr-sr),c=abs(dc-sc); return(r==2&&c==1)||(r==1&&c==2);}
        case 'b': return abs(dr-sr)==abs(dc-sc)&&is_path_clear(sr,sc,dr,dc);
        case 'q': return ((sr==dr||sc==dc)||(abs(dr-sr)==abs(dc-sc)))&&is_path_clear(sr,sc,dr,dc);
        case 'k': return abs(dr-sr)<=1&&abs(dc-sc)<=1;
        default: return 0;
    }
}

int is_in_check_board(int player,char b[BOARD_SIZE][BOARD_SIZE]){
    char k=(player==0)?'K':'k';int kr=-1,kc=-1;
    for(int i=0;i<BOARD_SIZE;i++)for(int j=0;j<BOARD_SIZE;j++)
        if(b[i][j]==k){kr=i;kc=j;break;}
    if(kr<0) return 1;
    for(int i=0;i<BOARD_SIZE;i++)for(int j=0;j<BOARD_SIZE;j++){
        char p=b[i][j];
        if(p==' ') continue;
        if((player==0&&islower(p))||(player==1&&isupper(p)))
            if(is_valid_move_board(i,j,kr,kc,b)) return 1;
    }
    return 0;
}

int is_in_check(int player){return is_in_check_board(player,board);}

int is_checkmate(int player){
    if(!is_in_check(player)) return 0;
    char tmp[BOARD_SIZE][BOARD_SIZE];
    for(int i=0;i<BOARD_SIZE;i++)for(int j=0;j<BOARD_SIZE;j++){
        if((player==0&&isupper(board[i][j]))||(player==1&&islower(board[i][j]))){
            for(int r=0;r<BOARD_SIZE;r++)for(int c=0;c<BOARD_SIZE;c++){
                if(is_valid_move_board(i,j,r,c,board)){
                    for(int a=0;a<BOARD_SIZE;a++)for(int b=0;b<BOARD_SIZE;b++) tmp[a][b]=board[a][b];
                    tmp[r][c]=tmp[i][j]; tmp[i][j]=' ';
                    if(!is_in_check_board(player,tmp)) return 0;
                }
            }
        }
    }
    return 1;
}
