

drop table ocrhash;
create table ocrhash (ids varchar(255) primary key,adr text ) engine myisam;
create fulltext index id_ft_hash on ocrhash(adr);


insert into ocrhash (ids,adr)
select
  group_concat(strid separator ',') ids,
  concat(strasse,' ',plz,' ',ort) adr
from fast_access_tour
where regiogruppe='Zustellung'
group by ort,plz,strasse;

-- SELECT ocrhash.strid,MATCH('ard') AGAINST ('Z453') as Relevance FROM ocrhash WHERE MATCH
-- ('adr') AGAINST('+keyword1 +keyword2' IN
-- BOOLEAN MODE) HAVING Relevance > 0.2 ORDER
-- BY Relevance DESC


DELIMITER $$
DROP FUNCTION IF EXISTS LEVENSHTEIN $$
CREATE FUNCTION LEVENSHTEIN(s1 VARCHAR(255) CHARACTER SET utf8, s2 VARCHAR(255) CHARACTER SET utf8)
RETURNS INT
DETERMINISTIC
BEGIN
  DECLARE s1_len, s2_len, i, j, c, c_temp, cost INT;
  DECLARE s1_char CHAR CHARACTER SET utf8;
  -- max strlen=255 for this function
  DECLARE cv0, cv1 VARBINARY(256);

  SET s1_len = CHAR_LENGTH(s1),
      s2_len = CHAR_LENGTH(s2),
      cv1 = 0x00,
      j = 1,
      i = 1,
      c = 0;

  IF (s1 = s2) THEN
    RETURN (0);
  ELSEIF (s1_len = 0) THEN
    RETURN (s2_len);
  ELSEIF (s2_len = 0) THEN
    RETURN (s1_len);
  END IF;

  WHILE (j <= s2_len) DO
    SET cv1 = CONCAT(cv1, CHAR(j)),
        j = j + 1;
  END WHILE;

  WHILE (i <= s1_len) DO
    SET s1_char = SUBSTRING(s1, i, 1),
        c = i,
        cv0 = CHAR(i),
        j = 1;

    WHILE (j <= s2_len) DO
      SET c = c + 1,
          cost = IF(s1_char = SUBSTRING(s2, j, 1), 0, 1);

      SET c_temp = ORD(SUBSTRING(cv1, j, 1)) + cost;
      IF (c > c_temp) THEN
        SET c = c_temp;
      END IF;

      SET c_temp = ORD(SUBSTRING(cv1, j+1, 1)) + 1;
      IF (c > c_temp) THEN
        SET c = c_temp;
      END IF;

      SET cv0 = CONCAT(cv0, CHAR(c)),
          j = j + 1;
    END WHILE;

    SET cv1 = cv0,
        i = i + 1;
  END WHILE;

  RETURN (c);
END $$

DELIMITER ;


create table orte as select ort from fast_access_tour group by ort;
create index idx_orte_ort on orte(ort);

create table strassen as select strasse from fast_access_tour group by strasse;
create index idx_strassen_strasse on strassen(strasse);
